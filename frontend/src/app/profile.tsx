import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/layout/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { OfficialFaceLogo } from '@/components/brand/OfficialLogos';
import { FormField } from '@/components/ui/FormField';
import { GoModal } from '@/components/ui/GoModal';
import { useAppState } from '@/state/AppState';
import { colors, radius, shadow, spacing, typography } from '@/theme/tokens';

export default function ProfileScreen() {
  const { nickname, setNickname, profile, priorities } = useAppState();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(nickname);
  const openNameEditor = () => { setNameDraft(nickname); setEditingName(true); };
  return (
    <AppScreen navigation contentStyle={styles.content}>
      <View style={styles.header}><Text style={styles.title}>내 프로필</Text><Pressable onPress={() => router.push('/settings')}><Text style={styles.settings}>⚙</Text></Pressable></View>
      <View style={styles.profileCard}><Pressable accessibilityRole="button" accessibilityLabel="프로필 사진 변경" onPress={() => router.push('/photo')} style={{ alignItems: 'center', gap: 4 }}>{profile?.photoUrl ? <Image source={{ uri: profile.photoUrl }} contentFit="cover" style={styles.avatar} /> : <OfficialFaceLogo size={100} />}<Text style={styles.caption}>사진 변경</Text></Pressable><View style={styles.identity}><Text style={styles.name}>{nickname}</Text><Text style={styles.caption}>가입일 2026년 8월</Text><Text style={styles.caption}>Google 로그인</Text></View><AppButton label="이름 수정" variant="secondary" onPress={openNameEditor} /></View>
      <Text style={styles.sectionTitle}>내 정보</Text><View style={styles.card}>{[['키', `${profile?.heightCm ?? '-'}cm`], ['체중', `${profile?.weightKg ?? '-'}kg`], ['평균 수면 시간', `${profile?.sleepHours ?? '-'}시간`], ['체수분', `${profile?.inbody?.bodyWaterL ?? '-'}L`], ['단백질', `${profile?.inbody?.proteinKg ?? '-'}kg`], ['무기질', `${profile?.inbody?.mineralKg ?? '-'}kg`], ['체지방', `${profile?.inbody?.bodyFatKg ?? '-'}kg`], ['골격근량', `${profile?.inbody?.skeletalMuscleKg ?? '-'}kg`], ['BMI', `${profile?.inbody?.bmi ?? '-'}`]].map(([key, value]) => <View key={key} style={styles.infoRow}><Text style={styles.caption}>{key}</Text><Text style={styles.infoValue}>{value}</Text></View>)}<Pressable onPress={() => router.push({ pathname: '/body-info', params: { edit: '1' } })} style={styles.smallButton}><Text style={styles.smallButtonText}>분석 정보 수정</Text></Pressable></View>
      <Text style={styles.sectionTitle}>우선 순위 설정</Text><View style={styles.card}><View style={styles.chips}>{priorities.map((item, index) => <View key={item} style={styles.priority}><View style={styles.chip}><Text style={styles.chipText}>{{ SKIN: '피부', BODY: '체형', HEALTH: '건강' }[item]}</Text></View><Text style={styles.rank}>{index + 1}순위</Text></View>)}</View><Pressable onPress={() => router.push('/priority')} style={styles.smallButton}><Text style={styles.smallButtonText}>우선 순위 변경</Text></Pressable></View>
      <AppButton label="내 분석 전체 삭제" variant="danger" onPress={() => router.push('/settings')} />
      <GoModal visible={editingName} title="표시 이름을 수정할까요?" description="홈과 프로필에 표시할 애칭을 최대 10자로 입력해주세요." confirmLabel="수정하기" confirmDisabled={!nameDraft.trim()} onClose={() => setEditingName(false)} onConfirm={() => { setNickname(nameDraft.trim()); setEditingName(false); }}><FormField value={nameDraft} onChangeText={(value) => setNameDraft(value.slice(0, 10))} placeholder="애칭을 입력해주세요." autoFocus /><Text style={{ ...typography.caption, color: colors.textMuted, textAlign: 'right' }}>{nameDraft.length}/10</Text></GoModal>
    </AppScreen>
  );
}
const styles = StyleSheet.create({ content: { gap: spacing.md }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, title: { ...typography.h1, color: colors.text }, settings: { fontSize: 28, color: colors.text }, profileCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: '#DFE7E5' }, avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primaryLight }, identity: { flex: 1, gap: 4 }, name: { ...typography.subtitle, color: colors.text }, caption: { ...typography.caption, color: colors.textTertiary }, sectionTitle: { ...typography.h1, color: colors.text }, card: { gap: 12, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow }, infoRow: { flexDirection: 'row', justifyContent: 'space-between' }, infoValue: { ...typography.label, color: colors.text }, chips: { flexDirection: 'row', justifyContent: 'space-around' }, priority: { alignItems: 'center', gap: 8 }, chip: { minWidth: 78, paddingVertical: 9, alignItems: 'center', borderRadius: radius.pill, backgroundColor: colors.primary }, chipText: { ...typography.label, color: colors.white }, rank: { ...typography.label, color: colors.textMuted }, smallButton: { alignSelf: 'flex-start', paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.surface, ...shadow }, smallButtonText: { ...typography.body, color: colors.textTertiary } });
