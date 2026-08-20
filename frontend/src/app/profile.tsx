import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { AppScreen } from '@/components/layout/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { OfficialFaceLogo } from '@/components/brand/OfficialLogos';
import { FormField } from '@/components/ui/FormField';
import { GoModal } from '@/components/ui/GoModal';
import { PriorityPicker } from '@/components/priority/PriorityPicker';
import { captureNotice } from '@/lib/capture';
import { useAppState } from '@/state/AppState';
import { colors, radius, shadow, spacing, typography } from '@/theme/tokens';
import type { Category } from '@/types/api';

const providerLabel = { LOCAL: '이메일로 가입', GOOGLE: 'Google 로그인' } as const;
const joinedLabel = (iso?: string) => { if (!iso) return ''; const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : `가입일 ${d.getFullYear()}년 ${d.getMonth() + 1}월`; };

export default function ProfileScreen() {
  const { nickname, setNickname, profile, priorities, savePriorities, deleteAllAnalyses, me } = useAppState();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(nickname);
  const [editingPriority, setEditingPriority] = useState(false);
  const [priorityDraft, setPriorityDraft] = useState<Category[]>(priorities);
  const [removing, setRemoving] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const capture = captureNotice(profile?.analysisSummary?.capture);
  const openNameEditor = () => { setNameDraft(nickname); setEditingName(true); };
  const openPriorityEditor = () => { setPriorityDraft(priorities); setNotice(''); setEditingPriority(true); };

  const commitPriorities = async () => {
    setPending(true);
    const outcome = await savePriorities(priorityDraft);
    setPending(false);
    setEditingPriority(false);
    setNotice(outcome.ok ? '우선순위를 저장했어요.' : outcome.message ?? '우선순위를 저장하지 못했어요.');
  };

  const commitDelete = async () => {
    setPending(true);
    const outcome = await deleteAllAnalyses();
    setPending(false);
    setRemoving(false);
    setNotice(outcome.ok ? '분석 정보를 모두 삭제했어요. 목표는 그대로 남아 있어요.' : outcome.message ?? '삭제하지 못했어요.');
  };
  return (
    <AppScreen navigation contentStyle={styles.content}>
      <View style={styles.header}><Text style={styles.title}>내 프로필</Text><Pressable accessibilityRole="button" accessibilityLabel="설정 열기" onPress={() => router.push('/settings')}><Icon name="gear" size={24} color={colors.textMuted} /></Pressable></View>
      <View style={styles.profileCard}><Pressable accessibilityRole="button" accessibilityLabel="프로필 사진 변경" onPress={() => router.push({ pathname: '/photo', params: { edit: '1' } })} style={{ alignItems: 'center', gap: 4 }}>{profile?.photoUrl ? <Image source={{ uri: profile.photoUrl }} contentFit="cover" style={styles.avatar} /> : <OfficialFaceLogo size={100} />}<Text style={styles.caption}>사진 변경</Text></Pressable><View style={styles.identity}><Text style={styles.name}>{nickname}</Text><Text style={styles.caption}>{joinedLabel(me?.joinedAt)}</Text><Text style={styles.caption}>{me ? providerLabel[me.provider] : ''}</Text></View><AppButton label="이름 수정" variant="secondary" onPress={openNameEditor} /></View>
      {capture ? (
        <View style={[styles.captureCard, capture.tone === 'warn' && styles.captureCardWarn]}>
          <Text style={styles.captureTitle}>{capture.title}</Text>
          {capture.reasons.map((reason) => <Text key={reason} style={styles.captureReason}>· {reason}</Text>)}
          <Text style={styles.captureHint}>{capture.hint}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="사진 다시 등록하기" onPress={() => router.push({ pathname: '/photo', params: { edit: '1' } })} style={styles.smallButton}><Text style={styles.smallButtonText}>사진 다시 등록하기</Text></Pressable>
        </View>
      ) : null}
      <Text style={styles.sectionTitle}>내 정보</Text><View style={styles.card}>{[['키', `${profile?.heightCm ?? '-'}cm`], ['체중', `${profile?.weightKg ?? '-'}kg`], ['평균 수면 시간', `${profile?.sleepHours ?? '-'}시간`], ['체수분', `${profile?.inbody?.bodyWaterL ?? '-'}L`], ['단백질', `${profile?.inbody?.proteinKg ?? '-'}kg`], ['무기질', `${profile?.inbody?.mineralKg ?? '-'}kg`], ['체지방', `${profile?.inbody?.bodyFatKg ?? '-'}kg`], ['골격근량', `${profile?.inbody?.skeletalMuscleKg ?? '-'}kg`], ['BMI', `${profile?.inbody?.bmi ?? '-'}`]].map(([key, value]) => <View key={key} style={styles.infoRow}><Text style={styles.caption}>{key}</Text><Text style={styles.infoValue}>{value}</Text></View>)}<Pressable onPress={() => router.push({ pathname: '/body-info', params: { edit: '1' } })} style={styles.smallButton}><Text style={styles.smallButtonText}>분석 정보 수정</Text></Pressable></View>
      <Text style={styles.sectionTitle}>우선 순위 설정</Text><View style={styles.card}><View style={styles.chips}>{priorities.map((item, index) => <View key={item} style={styles.priority}><View style={styles.chip}><Text style={styles.chipText}>{{ SKIN: '피부', BODY: '체형', HEALTH: '건강' }[item]}</Text></View><Text style={styles.rank}>{index + 1}순위</Text></View>)}</View><Pressable accessibilityRole="button" onPress={openPriorityEditor} style={styles.smallButton}><Text style={styles.smallButtonText}>우선 순위 변경</Text></Pressable></View>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <AppButton label="내 분석 전체 삭제" variant="danger" disabled={pending} onPress={() => setRemoving(true)} />
      <GoModal visible={editingName} title="표시 이름을 수정할까요?" description="홈과 프로필에 표시할 애칭을 최대 10자로 입력해주세요." confirmLabel="수정하기" confirmDisabled={!nameDraft.trim()} onClose={() => setEditingName(false)} onConfirm={() => { setNickname(nameDraft.trim()); setEditingName(false); }}><FormField value={nameDraft} onChangeText={(value) => setNameDraft(value.slice(0, 10))} placeholder="애칭을 입력해주세요." autoFocus /><Text style={{ ...typography.caption, color: colors.textMuted, textAlign: 'right' }}>{nameDraft.length}/10</Text></GoModal>
      <GoModal visible={editingPriority} title="우선 순위를 바꿀까요?" description="원하는 순서대로 눌러주세요. 순서가 곧 1·2·3순위예요." confirmLabel={pending ? '저장 중...' : '저장하기'} confirmDisabled={priorityDraft.length !== 3 || pending} onClose={() => setEditingPriority(false)} onConfirm={commitPriorities}>
        <PriorityPicker selected={priorityDraft} onChange={setPriorityDraft} />
      </GoModal>
      {/* 분석만 지운다. 목표는 남는다 — 시안 11이 그렇게 약속하고 스키마도 V4에서 그렇게 바뀌었다. */}
      <GoModal visible={removing} destructive title="분석 정보를 모두 삭제할까요?" description={`저장한 분석 결과와 사진이 삭제돼요.\n*계정, 목표 정보는 삭제되지 않아요.`} confirmLabel={pending ? '삭제 중...' : '삭제하기'} confirmDisabled={pending} onClose={() => setRemoving(false)} onConfirm={commitDelete} />
    </AppScreen>
  );
}
const styles = StyleSheet.create({ content: { gap: spacing.md }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, title: { ...typography.h1, color: colors.text }, settings: { fontSize: 28, color: colors.text }, profileCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: '#DFE7E5' }, avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primaryLight }, identity: { flex: 1, gap: 4 }, name: { ...typography.subtitle, color: colors.text }, caption: { ...typography.caption, color: colors.textTertiary }, sectionTitle: { ...typography.h1, color: colors.text }, card: { gap: 12, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow }, infoRow: { flexDirection: 'row', justifyContent: 'space-between' }, infoValue: { ...typography.label, color: colors.text }, chips: { flexDirection: 'row', justifyContent: 'space-around' }, priority: { alignItems: 'center', gap: 8 }, chip: { minWidth: 78, paddingVertical: 9, alignItems: 'center', borderRadius: radius.pill, backgroundColor: colors.primary }, chipText: { ...typography.label, color: colors.white }, rank: { ...typography.label, color: colors.textMuted }, smallButton: { alignSelf: 'flex-start', paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.surface, ...shadow }, smallButtonText: { ...typography.body, color: colors.textTertiary }, notice: { ...typography.caption, color: colors.textTertiary, textAlign: 'center' }, captureCard: { gap: 6, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderLeftWidth: 4, borderLeftColor: colors.primary, ...shadow }, captureCardWarn: { borderLeftColor: colors.point }, captureTitle: { ...typography.label, color: colors.text }, captureReason: { ...typography.caption, color: colors.textTertiary }, captureHint: { ...typography.caption, color: colors.textMuted, marginTop: 2 } });
