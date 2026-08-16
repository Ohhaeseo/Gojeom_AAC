import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/layout/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';
import { ProfilePhotoPanel, PrioritySummary } from '@/components/profile/ProfileSetupSummary';
import { useAppState } from '@/state/AppState';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import type { Inbody } from '@/types/api';

const inbodyFields: { key: keyof Inbody; label: string; unit: string }[] = [
  { key: 'bodyWaterL', label: '체수분', unit: 'L' }, { key: 'proteinKg', label: '단백질', unit: 'kg' },
  { key: 'mineralKg', label: '무기질', unit: 'kg' }, { key: 'bodyFatKg', label: '체지방', unit: 'kg' },
  { key: 'skeletalMuscleKg', label: '골격근량', unit: 'kg' }, { key: 'bmi', label: 'BMI', unit: '' },
];

const labelOf = (key: string) => inbodyFields.find((field) => field.key === key)?.label ?? key;

/** 읽은 항목 개수로 서버가 판정한 값이다. 모델의 자기 확신도가 아니다. (ScanConfidence) */
const confidenceNote = { HIGH: '6개 항목을 모두 읽었어요.', MEDIUM: '일부 항목만 읽었어요.', LOW: '읽어낸 항목이 적어요.' } as const;

export default function OptionalInfoScreen() {
  const params = useLocalSearchParams<{ height?: string; weight?: string; edit?: string }>();
  const { photoUri, priorities, profile, saveProfile, scanInbody } = useAppState();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState('');
  const editing = params.edit === '1';
  const height = params.height ?? String(profile?.heightCm ?? '');
  const weight = params.weight ?? String(profile?.weightKg ?? '');
  const [sleepHours, setSleepHours] = useState(() => editing && profile?.sleepHours != null ? String(profile.sleepHours) : ''); const [open, setOpen] = useState(false);
  const [inbody, setInbody] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(editing ? profile?.inbody ?? {} : {}).map(([key, value]) => [key, value == null ? '' : String(value)])));
  /**
   * 인바디 결과지를 찍어 폼을 채운다. 시안 08의 "카메라로 서류 스켄하기".
   *
   * 판독값은 **저장되지 않는다.** 여기서 채운 뒤 사용자가 확인하고 저장 버튼을
   * 눌러야 반영된다. 그래서 실패해도 화면은 직접 입력으로 그대로 진행된다. (PRD G-8)
   */
  const scan = async () => {
    setScanNote(''); setError('');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return setScanNote('사진 권한이 꺼져 있어요. 아래에 직접 입력해주세요.');

    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    const uri = picked.canceled ? undefined : picked.assets[0]?.uri;
    if (!uri) return;

    setScanning(true);
    const outcome = await scanInbody(uri);
    setScanning(false);
    if (!outcome.scan) return setScanNote(outcome.message ?? '인바디 정보를 읽지 못했어요. 아래에 직접 입력해주세요.');

    // 읽힌 값만 덮는다. 못 읽은 칸에 이미 적어둔 값을 지우면 안 된다.
    const read = Object.entries(outcome.scan.extracted).filter(([, value]) => value != null);
    setInbody((current) => ({ ...current, ...Object.fromEntries(read.map(([key, value]) => [key, String(value)])) }));
    const missing = outcome.scan.unrecognized;
    setScanNote(`${confidenceNote[outcome.scan.confidence]}${missing.length ? ` ${missing.map(labelOf).join(' · ')}은(는) 직접 입력해주세요.` : ''} 값이 맞는지 확인하고 저장해주세요.`);
  };

  const save = async () => {
    const values = Object.fromEntries(Object.entries(inbody).map(([key, value]) => [key, value ? Number(value) : null])) as Inbody;
    setPending(true); setError('');
    // 사진 업로드 → 프로필 등록까지 서버에서 처리된다. 몇 초 걸릴 수 있다.
    const result = await saveProfile({ priorities, heightCm: Number(height), weightKg: Number(weight), sleepHours: sleepHours ? Number(sleepHours) : null, inbody: values });
    setPending(false);
    if (!result.ok) return setError(result.message ?? '프로필을 저장하지 못했어요.');
    router.replace(editing ? '/profile' : '/profile-analysis');
  };
  return (
    <AppScreen navigation contentStyle={styles.content}>
      <Text style={styles.previous}>내 사진 등록하기</Text><ProfilePhotoPanel photoUri={photoUri} /><Text style={styles.previous}>우선 순위 등록하기</Text><PrioritySummary priorities={priorities} />
      <Text style={styles.previous}>신체 정보 입력하기</Text><Text style={styles.label}>필수 정보<Text style={styles.requiredMark}>*</Text></Text><View style={styles.summaryCard}><Text style={styles.summaryText}>키 {height}cm</Text><Text style={styles.summaryText}>몸무게 {weight}kg</Text></View>
      <Text style={styles.title}>선택 정보</Text><Text style={styles.description}>아래 정보를 추가하면 더 정확한 분석이 가능해요.</Text>
      <Text style={styles.label}>평균 수면 시간</Text>
      <Pressable onPress={() => setOpen(!open)} style={styles.select}><Text style={styles.selectText}>{sleepHours || '0'}</Text><Text style={styles.selectText}>시간⌄</Text></Pressable>
      {open ? <ScrollView nestedScrollEnabled showsVerticalScrollIndicator style={styles.options}>{Array.from({ length: 13 }, (_, value) => <Pressable key={value} onPress={() => { setSleepHours(String(value)); setOpen(false); }} style={styles.option}><Text style={styles.optionText}>{value}시간</Text></Pressable>)}</ScrollView> : null}
      <Text style={styles.label}>인바디 정보</Text>
      <AppButton label={scanning ? '서류를 읽고 있어요...' : '카메라로 서류 스캔하기'} variant="secondary" disabled={scanning} onPress={scan} />
      {scanNote ? <Text style={styles.scanNote}>{scanNote}</Text> : null}
      <View style={styles.grid}>{inbodyFields.map((field) => <View key={field.key} style={styles.half}><FormField label={field.label} value={inbody[field.key] ?? ''} onChangeText={(value) => setInbody((current) => ({ ...current, [field.key]: value }))} placeholder={field.unit} keyboardType="decimal-pad" /></View>)}</View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <AppButton label={pending ? '저장 중...' : editing ? '수정 완료' : '진단하기'} disabled={pending} onPress={save} />
    </AppScreen>
  );
}
const styles = StyleSheet.create({ content: { gap: spacing.md }, previous: { ...typography.h1, color: colors.textTertiary }, title: { ...typography.subtitle, color: colors.text }, description: { ...typography.body, color: colors.textMuted }, label: { ...typography.label, color: colors.text, marginTop: spacing.sm }, requiredMark: { color: colors.danger }, summaryCard: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: '#DFE7E5' }, summaryText: { flex: 1, ...typography.label, color: colors.textTertiary }, select: { height: 54, borderRadius: radius.md, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface }, selectText: { ...typography.body, color: colors.textTertiary }, options: { maxHeight: 220, borderRadius: radius.md, backgroundColor: colors.surface, overflow: 'hidden' }, option: { padding: 12 }, optionText: { ...typography.body, color: colors.textTertiary }, grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5, padding: 10, borderRadius: radius.lg, backgroundColor: '#DFE7E5' }, half: { width: '50%', padding: 5 }, scanNote: { ...typography.caption, color: colors.textTertiary }, errorText: { ...typography.caption, color: colors.danger } });
