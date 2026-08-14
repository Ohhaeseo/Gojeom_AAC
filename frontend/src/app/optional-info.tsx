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

export default function OptionalInfoScreen() {
  const params = useLocalSearchParams<{ height?: string; weight?: string; edit?: string }>();
  const { photoUri, priorities, profile, setProfile } = useAppState();
  const editing = params.edit === '1';
  const height = params.height ?? String(profile?.heightCm ?? '');
  const weight = params.weight ?? String(profile?.weightKg ?? '');
  const [sleepHours, setSleepHours] = useState(() => editing && profile?.sleepHours != null ? String(profile.sleepHours) : ''); const [open, setOpen] = useState(false);
  const [inbody, setInbody] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(editing ? profile?.inbody ?? {} : {}).map(([key, value]) => [key, value == null ? '' : String(value)])));
  const save = () => {
    const values = Object.fromEntries(Object.entries(inbody).map(([key, value]) => [key, value ? Number(value) : null])) as Inbody;
    setProfile({ profileId: profile?.profileId ?? 'profile-demo', photoUrl: photoUri ?? null, priorities, heightCm: Number(height), weightKg: Number(weight), sleepHours: sleepHours ? Number(sleepHours) : null, inbody: values });
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
      <Text style={styles.label}>인바디 정보</Text><View style={styles.grid}>{inbodyFields.map((field) => <View key={field.key} style={styles.half}><FormField label={field.label} value={inbody[field.key] ?? ''} onChangeText={(value) => setInbody((current) => ({ ...current, [field.key]: value }))} placeholder={field.unit} keyboardType="decimal-pad" /></View>)}</View>
      <AppButton label={editing ? '수정 완료' : '진단하기'} onPress={save} />
    </AppScreen>
  );
}
const styles = StyleSheet.create({ content: { gap: spacing.md }, previous: { ...typography.h1, color: colors.textTertiary }, title: { ...typography.subtitle, color: colors.text }, description: { ...typography.body, color: colors.textMuted }, label: { ...typography.label, color: colors.text, marginTop: spacing.sm }, requiredMark: { color: colors.danger }, summaryCard: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: '#DFE7E5' }, summaryText: { flex: 1, ...typography.label, color: colors.textTertiary }, select: { height: 54, borderRadius: radius.md, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface }, selectText: { ...typography.body, color: colors.textTertiary }, options: { maxHeight: 220, borderRadius: radius.md, backgroundColor: colors.surface, overflow: 'hidden' }, option: { padding: 12 }, optionText: { ...typography.body, color: colors.textTertiary }, grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5, padding: 10, borderRadius: radius.lg, backgroundColor: '#DFE7E5' }, half: { width: '50%', padding: 5 } });
