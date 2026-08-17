import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/layout/AppScreen';
import { AnimatedSwitch } from '@/components/ui/AnimatedSwitch';
import { FormField } from '@/components/ui/FormField';
import { GoModal } from '@/components/ui/GoModal';
import { formatAnalyzedDate, toIsoDate } from '@/lib/date';
import type { RoutineSummary } from '@/services/backend';
import { WEEKS_PER_MONTH, useAppState } from '@/state/AppState';
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
 * 시점 순서. 아침에 할 일이 저녁에 할 일보다 위에 와야 한다.
 *
 * `timing`은 AI가 쓰는 자유 문장("매일 외출 전" · "자기 전")이라 정해진 값이
 * 아니다. 그래서 **문자열에 들어 있는 단어로 가른다.** 아무 데도 걸리지 않으면
 * 중간에 둔다 — 모르는 것을 맨 앞이나 맨 뒤로 몰면 순서가 더 이상해진다.
 */
const TIMING_ORDER: { keywords: string[]; rank: number }[] = [
  { keywords: ['기상', '아침', '오전', '외출 전', '세수'], rank: 0 },
  { keywords: ['점심', '낮', '오후'], rank: 1 },
  { keywords: ['저녁', '퇴근', '샤워'], rank: 2 },
  { keywords: ['자기 전', '취침', '밤', '수면'], rank: 3 },
];

function timingRank(timing: string): number {
  const found = TIMING_ORDER.find((entry) => entry.keywords.some((word) => timing.includes(word)));
  return found ? found.rank : 1.5;
}

/**
 * 오늘 할 일.
 *
 * 서버는 AI가 만든 한 주치 구성을 **기간만큼 주 단위로 복제해** 저장한다
 * (`RoutineTxService.persistStandalone`). 6개월짜리 목표면 같은 태스크가 24번
 * 들어 있다. 그대로 그리면 96줄이 나열돼 화면이 쓸모없어진다.
 *
 * 오늘 이전 중 가장 최근 회차를 고르고, 아직 시작 전이면 첫 회차를 보여준다.
 * 그 회차의 태스크가 곧 오늘 할 일이다 — 매일 반복하는 습관이라 회차 안에서
 * 날짜가 더 갈리지 않는다.
 *
 * <b>완료 체크는 회차 단위다.</b> 오늘 체크하면 그 주가 완료로 기록된다.
 * 날짜별로 따로 체크하려면 태스크를 일 단위로 쪼개야 한다.
 */
function todayTasks(tasks: RoutineTask[]): { date?: string; items: RoutineTask[] } {
  if (!tasks.length) return { items: [] };
  const today = toIsoDate(new Date());
  const dates = [...new Set(tasks.map((task) => task.scheduledDate))].sort();
  const date = [...dates].reverse().find((value) => value <= today) ?? dates[0];
  const items = tasks
    .filter((task) => task.scheduledDate === date)
    .sort((a, b) => timingRank(a.timing) - timingRank(b.timing));
  return { date, items };
}

export default function RoutinesScreen() {
  const {
    routines, loadRoutines, openRoutine, tasks, toggleTask, loadDrawer, activeRoutineId,
    renameRoutine, deleteRoutine,
    notificationSettings, loadNotificationSettings, updateNotificationSettings,
  } = useAppState();
  const [selectedId, setSelectedId] = useState<string | undefined>(activeRoutineId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [renaming, setRenaming] = useState<RoutineSummary>();
  const [removing, setRemoving] = useState<RoutineSummary>();
  const [nameDraft, setNameDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const commitRename = async () => {
    if (!renaming) return;
    setBusy(true);
    const outcome = await renameRoutine(renaming.routineId, nameDraft);
    setBusy(false); setRenaming(undefined);
    if (!outcome.ok) setError(outcome.message ?? '목표 이름을 바꾸지 못했어요.');
  };

  const commitDelete = async () => {
    if (!removing) return;
    setBusy(true);
    const outcome = await deleteRoutine(removing.routineId);
    setBusy(false); setRemoving(undefined);
    if (!outcome.ok) return setError(outcome.message ?? '목표를 삭제하지 못했어요.');
    // 지운 것이 보고 있던 목표였다면 선택을 비운다. 남은 목표로 자동 전환된다.
    if (removing.routineId === selectedId) setSelectedId(undefined);
  };
  // 서랍에 저장한 결과가 있는지는 **서버에 물어본다.** 메모리의 result·saved는
  // 새로고침하면 비어서, 결과가 있는데도 "없어요"라고 말하게 된다.
  const [savedCount, setSavedCount] = useState<number>();

  // 목표를 만들고 돌아오면 목록이 달라져 있다. 화면에 들어올 때마다 다시 읽는다.
  useFocusEffect(useCallback(() => {
    let alive = true;
    void loadNotificationSettings();
    loadDrawer().then((d) => { if (alive) setSavedCount(d.all.length); }).catch(() => { if (alive) setSavedCount(0); });
    loadRoutines()
      .catch(() => { if (alive) setError('목표를 불러오지 못했어요.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [loadRoutines, loadNotificationSettings, loadDrawer]));

  const select = useCallback(async (routineId: string) => {
    setSelectedId(routineId); setError('');
    const outcome = await openRoutine(routineId);
    if (!outcome.ok) setError(outcome.message ?? '목표를 불러오지 못했어요.');
  }, [openRoutine]);

  // 목록이 오면 하나를 자동으로 펼친다. 한 번 더 누르게 하지 않는다.
  // **마지막에 보던 목표가 있으면 그것을 먼저 쓴다.** 목표가 둘 이상일 때
  // 매번 첫 번째로 튕기면 홈이 가리키는 목표와 어긋난다.
  const first = routines[0];
  useEffect(() => {
    if (routines.some((item) => item.routineId === selectedId)) return;
    const restore = routines.find((item) => item.routineId === activeRoutineId) ?? first;
    if (restore) void select(restore.routineId);
  }, [activeRoutineId, first, routines, select, selectedId]);

  if (loading && !routines.length) {
    return <AppScreen navigation contentStyle={styles.content}><ActivityIndicator color={colors.primary} style={styles.loading} /></AppScreen>;
  }

  if (!routines.length) return <EmptyRoutines savedCount={savedCount} error={error} />;

  const current = routines.find((item) => item.routineId === selectedId) ?? first;
  const done = tasks.filter((task) => task.status === 'DONE').length;
  const today = todayTasks(tasks);

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
          <View key={item.routineId} style={[styles.card, on && styles.cardOn]}>
            {/*
              카드를 누르면 펼쳐지고, 이름 변경·삭제는 **형제로 뺐다.**
              카드 안에 넣으면 누를 때 이벤트가 카드로 올라가 함께 발동한다.
              (오답 노트 N-11)
            */}
            <Pressable accessibilityRole="button" accessibilityLabel={`${item.title} 선택`} onPress={() => select(item.routineId)} style={styles.cardBody}>
              <View style={styles.cardHead}>
                <View style={styles.chip}><Text style={styles.chipText}>{item.category ? categoryLabel[item.category] : '진단 기반'}</Text></View>
                {/* 개월 환산은 WEEKS_PER_MONTH 하나로 맞춘다. 백엔드 RoutinePolicy와 같은 값이다. */}
                <Text style={styles.cardMeta}>{item.durationWeeks ? `${Math.round(item.durationWeeks / WEEKS_PER_MONTH)}개월` : '기간 없음'}</Text>
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.cardMeta}>{period(item.startDate)}{item.endDate ? ` — ${period(item.endDate)}` : ''} · 태스크 {item.taskCount}개</Text>
              {on && tasks.length ? <View style={styles.track}><View style={[styles.fill, { width: `${Math.round((done / tasks.length) * 100)}%` }]} /></View> : null}
            </Pressable>
            <View style={styles.cardActions}>
              <Pressable accessibilityRole="button" accessibilityLabel={`${item.title} 이름 바꾸기`} onPress={() => { setRenaming(item); setNameDraft(item.title); }} style={styles.cardAction}>
                <Text style={styles.cardActionText}>이름 바꾸기</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`${item.title} 삭제`} onPress={() => setRemoving(item)} style={styles.cardAction}>
                <Text style={[styles.cardActionText, styles.cardActionDanger]}>삭제</Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      <Text style={styles.sectionTitle}>오늘 할 일</Text>
      <Text style={styles.description}>{today.date ? `${formatAnalyzedDate(today.date)} 회차 · ` : ''}전체 {tasks.length}개 중 {done}개 완료</Text>
      {today.items.length ? today.items.map((task) => (
        <Pressable key={task.taskId} onPress={() => toggleTask(task.taskId)} style={[styles.task, task.status === 'DONE' && styles.taskDone]}>
          <View style={styles.taskCopy}>
            <Text style={[styles.taskTitle, task.status === 'DONE' && styles.doneText]}>{task.title}</Text>
            {/* 소요 시간(durationLabel)은 빼고 시점과 분량만 남긴다. */}
            <Text style={styles.meta}>{task.timing}{task.amountLabel ? ` · ${task.amountLabel}` : ''}</Text>
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

      <GoModal
        visible={Boolean(renaming)}
        title="목표 이름을 바꿀까요?"
        description="목표가 여러 개일 때 구분하기 쉬운 이름으로 바꿔보세요."
        confirmLabel={busy ? '저장 중...' : '저장하기'}
        confirmDisabled={!nameDraft.trim() || busy}
        onClose={() => setRenaming(undefined)}
        onConfirm={commitRename}
      >
        <FormField value={nameDraft} onChangeText={(value) => setNameDraft(value.slice(0, 60))} placeholder="목표 이름을 입력해주세요." autoFocus />
        <Text style={styles.counter}>{nameDraft.length}/60</Text>
      </GoModal>

      {/* 태스크가 함께 지워진다는 것을 미리 알린다. 되돌릴 수 없다. */}
      <GoModal
        visible={Boolean(removing)}
        destructive
        title="목표를 삭제할까요?"
        description={`"${removing?.title ?? ''}"과(와) 여기에 속한 태스크 ${removing?.taskCount ?? 0}개가 함께 삭제돼요. 되돌릴 수 없어요.`}
        confirmLabel={busy ? '삭제 중...' : '삭제하기'}
        confirmDisabled={busy}
        onClose={() => setRemoving(undefined)}
        onConfirm={commitDelete}
      />
    </AppScreen>
  );
}

/**
 * 목표가 하나도 없을 때. **두 갈래만 보여준다.**
 *
 * 분석을 안 한 사람에게 목록·진행도 같은 것을 띄우지 않는다. 고를 것이 두 개뿐이면
 * 화면도 두 개만 있어야 한다.
 */
function EmptyRoutines({ savedCount, error }: { savedCount?: number; error: string }) {
  const hasSaved = (savedCount ?? 0) > 0;
  return (
    <AppScreen navigation contentStyle={styles.content}>
      <View style={styles.emptyHead}>
        <Text style={styles.title}>아직 만든 목표가 없어요</Text>
        <Text style={styles.lead}>두 가지 방법 중 편한 쪽으로 시작해보세요.</Text>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable accessibilityRole="button" onPress={() => router.push('/routine-new')} style={[styles.pathCard, styles.pathCardPrimary]}>
        <View style={styles.pathHead}><Text style={[styles.pathTitle, styles.pathTitleOn]}>새 목표 만들기</Text><Text style={[styles.pathArrow, styles.pathTitleOn]}>›</Text></View>
        <Text style={[styles.pathText, styles.pathTextOn]}>진단 없이 카테고리와 기간만 골라 바로 시작해요.</Text>
      </Pressable>

      <Pressable accessibilityRole="button" onPress={() => router.push('/drawer')} style={[styles.pathCard, !hasSaved && styles.pathCardOff]}>
        <View style={styles.pathHead}><Text style={styles.pathTitle}>서랍에서 분석 가져오기</Text><Text style={styles.pathArrow}>›</Text></View>
        <Text style={styles.pathText}>{hasSaved ? `저장한 분석 ${savedCount}개로 나에게 맞춘 목표를 만들어요.` : '아직 서랍에 저장한 분석이 없어요.'}</Text>
      </Pressable>
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
  card: { borderRadius: radius.lg, borderWidth: 1, borderColor: 'transparent', backgroundColor: colors.surface, overflow: 'hidden', ...shadow },
  cardOn: { borderColor: colors.primary },
  cardBody: { gap: 8, padding: spacing.md },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.divider },
  cardAction: { flex: 1, alignItems: 'center', paddingVertical: 11 },
  cardActionText: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  cardActionDanger: { color: colors.danger },
  counter: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
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
