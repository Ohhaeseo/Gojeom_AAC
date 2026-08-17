import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/layout/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AnimatedSwitch } from '@/components/ui/AnimatedSwitch';
import { formatAnalyzedDate, toIsoDate } from '@/lib/date';
import { useAppState } from '@/state/AppState';
import { colors, radius, shadow, spacing, typography } from '@/theme/tokens';
import type { RoutineTask } from '@/types/api';

/**
 * 루틴 화면 — 경로 A·B로 만든 목표를 함께 다룬다. (API.md §6.6)
 *
 * **분석이 없어도 여기서 목표를 만들 수 있다.** 목록이 비어 있으면 두 갈래를 모두
 * 제시한다 — 저장한 진단 결과로 만들거나, 진단 없이 카테고리만 골라 만들거나.
 */
const categoryLabel = { SKIN: '피부', BODY: '체형', HEALTH: '건강' } as const;
const period = (value: string | null) => (value ?? '').replaceAll('-', '.');

/**
 * 이번 주에 해당하는 태스크만 고른다.
 *
 * 서버는 AI가 만든 한 주치 구성을 **기간만큼 주 단위로 복제해** 저장한다
 * (`RoutineTxService.persistStandalone`). 6개월짜리 목표면 같은 태스크가 24번
 * 들어 있다. 그대로 그리면 96줄이 나열돼 화면이 쓸모없어진다.
 *
 * 오늘 이전 중 가장 최근 회차를 고르고, 아직 시작 전이면 첫 회차를 보여준다.
 */
function currentWeek(tasks: RoutineTask[]): { date?: string; items: RoutineTask[] } {
  if (!tasks.length) return { items: [] };
  const today = toIsoDate(new Date());
  const dates = [...new Set(tasks.map((task) => task.scheduledDate))].sort();
  const date = [...dates].reverse().find((value) => value <= today) ?? dates[0];
  return { date, items: tasks.filter((task) => task.scheduledDate === date) };
}

export default function RoutinesScreen() {
  const {
    routines, loadRoutines, openRoutine, tasks, toggleTask, result, saved,
    notificationSettings, loadNotificationSettings, updateNotificationSettings,
  } = useAppState();
  const [selectedId, setSelectedId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 목표를 만들고 돌아오면 목록이 달라져 있다. 화면에 들어올 때마다 다시 읽는다.
  useFocusEffect(useCallback(() => {
    let alive = true;
    void loadNotificationSettings();
    loadRoutines()
      .catch(() => { if (alive) setError('목표를 불러오지 못했어요.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [loadRoutines, loadNotificationSettings]));

  const select = useCallback(async (routineId: string) => {
    setSelectedId(routineId); setError('');
    const outcome = await openRoutine(routineId);
    if (!outcome.ok) setError(outcome.message ?? '목표를 불러오지 못했어요.');
  }, [openRoutine]);

  // 목록이 오면 첫 목표를 자동으로 펼친다. 한 번 더 누르게 하지 않는다.
  const first = routines[0];
  useEffect(() => {
    if (first && !routines.some((item) => item.routineId === selectedId)) void select(first.routineId);
  }, [first, routines, select, selectedId]);

  if (loading && !routines.length) {
    return <AppScreen navigation contentStyle={styles.content}><ActivityIndicator color={colors.primary} style={styles.loading} /></AppScreen>;
  }

  if (!routines.length) return <EmptyRoutines hasResult={Boolean(result)} hasSaved={saved} error={error} />;

  const current = routines.find((item) => item.routineId === selectedId) ?? first;
  const done = tasks.filter((task) => task.status === 'DONE').length;
  const week = currentWeek(tasks);

  return (
    <AppScreen navigation contentStyle={styles.content}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>내 루틴</Text>
        <Pressable onPress={() => router.push('/routine-new')} style={styles.addBtn}><Text style={styles.addText}>+ 새 목표</Text></Pressable>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {routines.map((item) => {
        const on = item.routineId === current?.routineId;
        return (
          <Pressable key={item.routineId} onPress={() => select(item.routineId)} style={[styles.card, on && styles.cardOn]}>
            <View style={styles.cardHead}>
              <View style={styles.chip}><Text style={styles.chipText}>{item.category ? categoryLabel[item.category] : '진단 기반'}</Text></View>
              <Text style={styles.cardMeta}>{item.durationWeeks ? `${Math.round(item.durationWeeks / 4)}개월` : '기간 없음'}</Text>
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.cardMeta}>{period(item.startDate)}{item.endDate ? ` — ${period(item.endDate)}` : ''} · 태스크 {item.taskCount}개</Text>
            {on && tasks.length ? <View style={styles.track}><View style={[styles.fill, { width: `${Math.round((done / tasks.length) * 100)}%` }]} /></View> : null}
          </Pressable>
        );
      })}

      <Text style={styles.sectionTitle}>이번 주 할 일</Text>
      <Text style={styles.description}>{week.date ? `${formatAnalyzedDate(week.date)} 회차 · ` : ''}전체 {tasks.length}개 중 {done}개 완료</Text>
      {week.items.length ? week.items.map((task) => (
        <Pressable key={task.taskId} onPress={() => toggleTask(task.taskId)} style={[styles.task, task.status === 'DONE' && styles.taskDone]}>
          <View style={styles.taskCopy}>
            <Text style={[styles.taskTitle, task.status === 'DONE' && styles.doneText]}>{task.title}</Text>
            <Text style={styles.meta}>{task.timing} / {task.durationLabel} / {task.amountLabel}</Text>
          </View>
          <View style={styles.completeRow}><View style={[styles.checkbox, task.status === 'DONE' && styles.checkboxDone]}><Text style={styles.check}>{task.status === 'DONE' ? '✓' : ''}</Text></View><Text style={styles.completeText}>완료</Text></View>
        </Pressable>
      )) : <Text style={styles.description}>태스크를 불러오는 중이에요.</Text>}

      <Text style={styles.sectionTitle}>알림 설정</Text>
      <Text style={styles.description}>설정한 시간에 루틴 알림을 받을게요.</Text>
      <View style={styles.alarm}>
        <View><Text style={styles.taskTitle}>루틴 알림</Text><Text style={styles.meta}>매일 {notificationSettings.defaultTime}</Text></View>
        <AnimatedSwitch accessibilityLabel="루틴 알림" value={notificationSettings.enabled} onValueChange={(enabled) => void updateNotificationSettings({ enabled })} />
      </View>
    </AppScreen>
  );
}

/** 목표가 하나도 없을 때. **두 갈래를 나란히 보여준다.** */
function EmptyRoutines({ hasResult, hasSaved, error }: { hasResult: boolean; hasSaved: boolean; error: string }) {
  const canUseAnalysis = hasResult || hasSaved;
  return (
    <AppScreen navigation contentStyle={styles.content}>
      <View style={styles.emptyHead}>
        <Text style={styles.title}>아직 만든 목표가 없어요</Text>
        <Text style={styles.lead}>두 가지 방법 중 편한 쪽으로 시작해보세요.</Text>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable onPress={() => router.push(hasResult ? '/goal' : '/drawer')} style={[styles.pathCard, !canUseAnalysis && styles.pathCardOff]}>
        <View style={styles.pathHead}><Text style={styles.pathTitle}>진단 결과로 만들기</Text><Text style={styles.pathArrow}>›</Text></View>
        <Text style={styles.pathText}>{canUseAnalysis ? '저장한 고점 분석을 바탕으로 나에게 맞춘 목표를 만들어요.' : '아직 저장한 분석 결과가 없어요. 진단을 먼저 완료하면 열려요.'}</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/routine-new')} style={[styles.pathCard, styles.pathCardPrimary]}>
        <View style={styles.pathHead}><Text style={[styles.pathTitle, styles.pathTitleOn]}>루틴만 만들기</Text><Text style={[styles.pathArrow, styles.pathTitleOn]}>›</Text></View>
        <Text style={[styles.pathText, styles.pathTextOn]}>진단 없이 카테고리와 기간만 골라 바로 시작해요.</Text>
      </Pressable>

      {canUseAnalysis ? null : <AppButton label="고점 분석하기" variant="secondary" onPress={() => router.push('/analysis-new')} />}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  loading: { marginTop: spacing.xl },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.h1, color: colors.text },
  lead: { ...typography.body, color: colors.textMuted },
  addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.primary },
  addText: { ...typography.caption, color: colors.white, fontWeight: '700' },
  card: { gap: 8, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: 'transparent', backgroundColor: colors.surface, ...shadow },
  cardOn: { borderColor: colors.primary },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.primary },
  chipText: { ...typography.caption, color: colors.white, fontWeight: '700' },
  cardTitle: { ...typography.label, color: colors.text },
  cardMeta: { ...typography.caption, color: colors.textMuted },
  track: { height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: colors.disabled, marginTop: 4 },
  fill: { height: '100%', borderRadius: 5, backgroundColor: colors.primaryLight },
  sectionTitle: { ...typography.title, color: colors.text, marginTop: spacing.sm },
  description: { ...typography.caption, color: colors.textMuted },
  task: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: '#DFE7E5' },
  taskDone: { opacity: 0.68 },
  taskCopy: { flex: 1, gap: 5 },
  taskTitle: { ...typography.body, color: colors.text },
  doneText: { color: colors.textMuted },
  meta: { ...typography.caption, color: colors.textTertiary },
  completeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkbox: { width: 21, height: 21, alignItems: 'center', justifyContent: 'center', borderRadius: 4, borderWidth: 1, borderColor: colors.textMuted, backgroundColor: colors.surface },
  checkboxDone: { borderColor: colors.primary, backgroundColor: colors.primary },
  check: { color: colors.white, fontWeight: '700' },
  completeText: { ...typography.body, color: colors.text },
  alarm: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow },
  emptyHead: { gap: 6, marginTop: spacing.lg, marginBottom: spacing.sm },
  pathCard: { gap: 8, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow },
  pathCardPrimary: { backgroundColor: colors.text },
  pathCardOff: { opacity: 0.6 },
  pathHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pathTitle: { ...typography.title, color: colors.text },
  pathTitleOn: { color: colors.white },
  pathArrow: { fontSize: 24, color: colors.textMuted },
  pathText: { ...typography.caption, color: colors.textMuted },
  pathTextOn: { color: colors.primaryLight },
  errorText: { ...typography.caption, color: colors.danger },
});
