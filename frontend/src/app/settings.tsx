import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { AppScreen } from '@/components/layout/AppScreen';
import { AnimatedSwitch } from '@/components/ui/AnimatedSwitch';
import { GoModal } from '@/components/ui/GoModal';
import { pushMessage, registerForPush } from '@/services/push';
import { useAppState } from '@/state/AppState';
import { colors, radius, spacing, typography } from '@/theme/tokens';

/** 알림 시각 후보. 서버 계약이 `"HH:mm"`이다. (API.md §6.7 · AGENTS.md N-6) */
const times = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`);

export default function SettingsScreen() {
  const { notificationSettings, loadNotificationSettings, updateNotificationSettings, logout, deleteAccount, deleteAllAnalyses } = useAppState();
  const [exit, setExit] = useState(false); const [remove, setRemove] = useState(false); const [withdraw, setWithdraw] = useState(false);
  const [open, setOpen] = useState(false); const [error, setError] = useState(''); const [pending, setPending] = useState(false);
  /*
    🔴 **안내와 실패를 한 자리에 쓰지 않는다.**

    알림을 켜면 설정은 저장되지만 **이 기기로는 못 받는** 경우가 있다(웹·권한 거절·
    시뮬레이터). 그때 오는 문구를 빨간 오류 자리에 찍고 있어서, 껐다 켤 때마다
    "오류가 난다"로 읽혔다. 권한 확인 성공 문구까지 빨갛게 나왔다.

    저장에 실패한 것만 `error`, 저장은 됐고 알려줄 것이 있으면 `notice`다.
  */
  const [notice, setNotice] = useState('');

  useFocusEffect(useCallback(() => { void loadNotificationSettings(); }, [loadNotificationSettings]));

  /**
   * 분석 정보만 지운다. **계정과 목표는 남는다.**
   *
   * 예전에는 이 버튼이 `deleteAccount`에 연결돼 있었다. 이름은 분석 삭제인데
   * 계정이 통째로 지워져서, 분석만 지우려던 사람이 계정을 잃었다.
   */
  const purgeAnalyses = async () => {
    setPending(true); setError('');
    const outcome = await deleteAllAnalyses();
    setPending(false); setRemove(false);
    if (!outcome.ok) return setError(outcome.message ?? '분석 정보를 삭제하지 못했어요.');
    router.replace('/home');
  };

  /**
   * 알림 권한 확인. **밑줄이 그어져 있으면 눌리는 것이어야 한다.**
   *
   * 예전에는 문구만 있고 `onPress`가 없어, 눌러도 아무 일이 없었다. 라벨이 하는
   * 말과 동작이 다른 자리였다.
   *
   * 실제로 권한을 물어보고 그 결과를 그대로 알려준다. 이미 허락했으면 다시 묻지
   * 않고 잘 되고 있다고 말한다. (`services/push`)
   */
  const checkPermission = async () => {
    setError(''); setNotice('');
    const result = await registerForPush();
    if (result.ok) return setNotice('알림을 받을 수 있어요. 기기가 등록됐어요.');
    // 권한 거절만 사용자가 고칠 수 있는 '오류'다. 웹·빌드 문제는 안내에 가깝다.
    const message = pushMessage(result) ?? '';
    if (result.reason === 'DENIED') setError(message); else setNotice(message);
  };

  const apply = async (patch: { enabled?: boolean; defaultTime?: string }) => {
    setError(''); setNotice('');
    const outcome = await updateNotificationSettings(patch);
    // 저장 자체가 실패한 것만 오류다. 저장은 됐는데 이 기기로 못 받는 것은 안내다.
    if (!outcome.ok) return setError(outcome.message ?? '알림 설정을 저장하지 못했어요.');
    setNotice(outcome.message ?? '');
  };

  return (
    <AppScreen navigation contentStyle={styles.content}>
      <Text style={styles.title}>이용권</Text>
      {/* 잔여 횟수를 여기 그리지 않는다. 요금제 화면이 서버에서 받아 보여준다. */}
      <Pressable accessibilityRole="button" accessibilityLabel="요금제 보기" onPress={() => router.push('/plan')} style={styles.row}>
        <View style={styles.rowCopy}><Text style={styles.label}>요금제</Text><Text style={styles.description}>구독 상태를 확인하고 분석을 무제한으로 이용해요.</Text></View>
        <Icon name="chevronRight" size={18} color={colors.textMuted} />
      </Pressable>
      <Text style={styles.title}>알림 설정</Text><Text style={styles.lead}>목표 알림을 받을 시간을 직접 설정해 보세요.</Text>
      <View style={styles.row}><View style={styles.rowCopy}><Text style={styles.label}>루틴 알림</Text><Text style={styles.description}>설정한 시간에 루틴 알림을 받을게요.</Text></View><AnimatedSwitch value={notificationSettings.enabled} onValueChange={(enabled) => void apply({ enabled })} accessibilityLabel="루틴 알림" /></View>
      <Text style={styles.title}>알림 시간</Text>
      {/* 서버는 계정 단위 기본 시각 하나만 갖는다. 목표별 시각을 바꾸는 API가 아직 없다. */}
      <View style={styles.card}>
        <View style={styles.timeRow}><View style={styles.rowCopy}><Text style={styles.label}>기본 알림 시간</Text><Text style={styles.description}>모든 목표 알림이 이 시간에 전송돼요.</Text></View><Pressable onPress={() => setOpen(!open)} disabled={!notificationSettings.enabled} style={[styles.timeSelect, notificationSettings.enabled ? null : styles.timeSelectOff]}><View style={styles.timeValue}><Text style={styles.timeText}>{notificationSettings.defaultTime}</Text><Icon name="chevronDown" size={14} color={colors.textTertiary} /></View></Pressable></View>
        {open ? <ScrollView nestedScrollEnabled showsVerticalScrollIndicator style={styles.options}>{times.map((time) => <Pressable key={time} onPress={() => { setOpen(false); void apply({ defaultTime: time }); }} style={styles.option}><Text style={styles.optionText}>{time}</Text></Pressable>)}</ScrollView> : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
      <View style={styles.card}><Text style={styles.label}>알림 권한 설정</Text><Text style={styles.description}>알림을 받으려면 기기에서 GO.의 알림 권한을 허용해야 해요.{`\n`}권한을 허용하지 않으면 알림이 전송되지 않아요.</Text><Text accessibilityRole="button" accessibilityLabel="알림 권한 확인하기" onPress={checkPermission} style={styles.underline}>알림 권한 확인하기</Text></View>
      <View style={styles.card}><Text style={styles.label}>개인정보 보호 안내</Text><Text style={styles.description}>얼굴 사진과 건강 정보는 분석 및 개인화 결과 제공 목적으로만 사용되며, 다른 사용자나 공개 영역에 노출되지 않습니다.</Text></View>
      <Text accessibilityRole="button" accessibilityLabel="원본 사진과 분석 정보 삭제" onPress={() => setRemove(true)} style={styles.danger}>원본 사진, 분석 정보 삭제</Text>
      <View style={styles.accountRow}>
        <Text accessibilityRole="button" accessibilityLabel="로그아웃" onPress={() => setExit(true)} style={styles.action}>로그아웃</Text>
        <Text accessibilityRole="button" accessibilityLabel="회원 탈퇴" onPress={() => setWithdraw(true)} style={styles.withdraw}>회원 탈퇴</Text>
      </View>

      <GoModal visible={exit} title="로그아웃할까요?" description="계정에 저장된 정보는 유지되며 다시 로그인하면 이어서 사용할 수 있어요." confirmLabel="로그아웃" onClose={() => setExit(false)} onConfirm={() => { void logout(); setExit(false); router.replace('/auth'); }} />

      {/* 지우는 범위를 그대로 적는다. 목표가 남는 것은 시안 11의 약속이다. */}
      <GoModal visible={remove} destructive title="분석 정보를 삭제할까요?" description="분석에 사용한 원본 사진과 분석 결과, 서랍에 저장한 항목이 삭제돼요. 계정과 목표는 그대로 남아요." confirmLabel={pending ? '삭제 중...' : '삭제하기'} confirmDisabled={pending} onClose={() => setRemove(false)} onConfirm={purgeAnalyses} />

      {/*
        "같은 아이디로 로그인할 수 없어요"를 쓰지 않는다. **사실이 아니다.**
        V5·V7이 탈퇴 계정을 유일성 범위에서 빼서 같은 아이디로 재가입할 수 있다.
      */}
      <GoModal visible={withdraw} destructive title="정말 탈퇴할까요?" description="계정과 프로필 사진, 분석 결과, 목표 정보가 모두 삭제돼요. 되돌릴 수 없어요." confirmLabel="탈퇴하기" onClose={() => setWithdraw(false)} onConfirm={() => { void deleteAccount(); setWithdraw(false); router.replace('/auth'); }} />
    </AppScreen>
  );
}
const styles = StyleSheet.create({ content: { gap: spacing.md }, title: { ...typography.h1, color: colors.text }, lead: { ...typography.body, color: colors.textTertiary }, row: { minHeight: 96, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface }, rowCopy: { flex: 1, gap: 4 }, card: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface }, timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }, timeSelect: { width: 120, height: 50, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 18, borderRadius: radius.md, borderWidth: 1, borderColor: colors.disabled, backgroundColor: colors.surface }, timeSelectOff: { opacity: 0.45 }, timeValue: { flexDirection: 'row', alignItems: 'center', gap: 4 }, timeText: { ...typography.body, color: colors.textTertiary }, options: { maxHeight: 220, borderRadius: radius.md, backgroundColor: colors.surfaceSunken, overflow: 'hidden' }, option: { padding: 12 }, optionText: { ...typography.body, color: colors.textTertiary }, label: { ...typography.label, color: colors.text }, chevron: { ...typography.title, color: colors.textMuted }, description: { ...typography.caption, color: colors.textMuted }, underline: { ...typography.caption, color: colors.text, textDecorationLine: 'underline' }, accountRow: { flexDirection: 'row', gap: spacing.sm }, action: { flex: 1, ...typography.body, color: colors.text, textAlign: 'center', padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface }, withdraw: { flex: 1, ...typography.body, color: colors.textMuted, textAlign: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider }, danger: { ...typography.body, color: colors.danger, textAlign: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.danger }, errorText: { ...typography.caption, color: colors.danger }, noticeText: { ...typography.caption, color: colors.textTertiary } });
