import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/layout/AppScreen';
import { AnimatedSwitch } from '@/components/ui/AnimatedSwitch';
import { GoModal } from '@/components/ui/GoModal';
import { useAppState } from '@/state/AppState';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function SettingsScreen() {
  const [notification, setNotification] = useState(true); const [exit, setExit] = useState(false); const [remove, setRemove] = useState(false);
  const { logout, deleteAccount } = useAppState();
  return (
    <AppScreen navigation contentStyle={styles.content}>
      <Text style={styles.title}>알림 설정</Text><Text style={styles.lead}>목표 알림을 받을 시간을 직접 설정해 보세요.</Text>
      <View style={styles.row}><View><Text style={styles.label}>루틴 알림</Text><Text style={styles.description}>설정한 시간에 루틴 알림을 받을게요.</Text></View><AnimatedSwitch value={notification} onValueChange={setNotification} accessibilityLabel="루틴 알림" /></View>
      <Text style={styles.title}>루틴별 알림 시간</Text><View style={styles.card}>{Array.from({ length: 5 }, (_, index) => <View key={index} style={styles.timeRow}><View><Text style={styles.label}>아침 스킨 케어</Text><Text style={styles.description}>매일 오전</Text></View><View style={styles.timeSelect}><Text style={styles.timeText}>시간⌄</Text></View></View>)}</View>
      <View style={styles.card}><Text style={styles.label}>알림 권한 설정</Text><Text style={styles.description}>알림을 받으려면 기기에서 GO.의 알림 권한을 허용해야 해요.{`\n`}권한을 허용하지 않으면 알림이 전송되지 않아요.</Text><Text style={styles.underline}>알림 권한 확인하기</Text></View>
      <View style={styles.card}><Text style={styles.label}>개인정보 보호 안내</Text><Text style={styles.description}>얼굴 사진과 건강 정보는 분석 및 개인화 결과 제공 목적으로만 사용되며, 다른 사용자나 공개 영역에 노출되지 않습니다.</Text></View>
      <Text onPress={() => setRemove(true)} style={styles.danger}>원본 사진, 분석 정보 삭제</Text><Text onPress={() => setExit(true)} style={styles.action}>로그아웃</Text>
      <GoModal visible={exit} title="로그아웃할까요?" description="계정에 저장된 정보는 유지되며 다시 로그인하면 이어서 사용할 수 있어요." confirmLabel="로그아웃" onClose={() => setExit(false)} onConfirm={() => { void logout(); setExit(false); router.replace('/auth'); }} />
      <GoModal visible={remove} destructive title="정보를 삭제할까요?" description="계정과 프로필 사진, 분석 결과, 루틴 정보가 모두 삭제되며 같은 아이디로 로그인할 수 없어요." confirmLabel="삭제하기" onClose={() => setRemove(false)} onConfirm={() => { void deleteAccount(); setRemove(false); router.replace('/auth'); }} />
    </AppScreen>
  );
}
const styles = StyleSheet.create({ content: { gap: spacing.md }, title: { ...typography.h1, color: colors.text }, lead: { ...typography.body, color: colors.textTertiary }, row: { minHeight: 96, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface }, card: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface }, timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, timeSelect: { width: 145, height: 50, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 18, borderRadius: radius.md, borderWidth: 1, borderColor: colors.disabled, backgroundColor: colors.surface }, timeText: { ...typography.body, color: colors.textTertiary }, label: { ...typography.label, color: colors.text }, description: { ...typography.caption, color: colors.textMuted }, underline: { ...typography.caption, color: colors.text, textDecorationLine: 'underline' }, action: { ...typography.body, color: colors.text, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface }, danger: { ...typography.body, color: colors.danger, textAlign: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.danger }, version: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: 'auto' } });
