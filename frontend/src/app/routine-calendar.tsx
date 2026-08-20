import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { AppScreen } from '@/components/layout/AppScreen';
import {
  dayLabel, groupByDate, monthGrid, monthLabel, monthsOf, nearestDate,
} from '@/lib/calendar';
import { toIsoDate } from '@/lib/date';
import { groupByTiming, scheduledTasks, visibleTasks, weeklyProgress } from '@/lib/tasks';
import * as backend from '@/services/backend';
import type { RoutineDetail } from '@/services/backend';
import { colors, radius, shadow, spacing, typography } from '@/theme/tokens';
import type { RoutineTask } from '@/types/api';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 목표 캘린더. 기간 안에서 **어느 날 무엇이 배정됐는지**를 본다.
 *
 * <p>서버는 이미 필요한 것을 다 준다 — {@code GET /routines/{id}}가 태스크마다
 * {@code scheduledDate}를 실어 보낸다. 백엔드는 건드리지 않았다.
 *
 * <p>🔴 <b>지금 일정은 드문드문하다.</b> 목표를 만들 때 태스크 묶음을 <b>주 단위로</b>
 * 복제하므로({@code RoutineTxService}), 4주 목표면 한 달에 배정일이 <b>4일</b>뿐이고
 * 분석 기반 목표는 <b>시작일 하루</b>뿐이다. 달력은 이 사실을 고치지 못하고
 * <b>드러낸다</b> — 그래서 빈 날에 "가장 가까운 날"을 함께 말해 준다.
 * 매일이 채워지려면 일정을 빈도대로 펼쳐야 한다.
 *
 * <p>태스크를 {@code AppState}가 아니라 <b>이 화면이 직접</b> 들고 있다.
 * {@code AppState.tasks}는 "지금 고른 목표들"의 것이라, 다른 목표의 달력을 열면
 * 홈의 오늘 할 일이 그 목표로 바뀌어 버린다.
 */
export default function RoutineCalendarScreen() {
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();

  const [detail, setDetail] = useState<RoutineDetail>();
  const [tasks, setTasks] = useState<RoutineTask[]>([]);
  const [month, setMonth] = useState<string>();
  const [picked, setPicked] = useState<string>();
  const [error, setError] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!routineId) { setFailed(true); setError('어떤 목표인지 알 수 없어요.'); return; }

    let alive = true;
    backend.getRoutine(routineId)
      .then((loaded) => {
        if (!alive) return;
        setDetail(loaded);
        setTasks(loaded.tasks);
        // 오늘이 든 달을 먼저 편다. 일정에 없는 달이면 첫 달로 떨어진다.
        const months = monthsOf(loaded.tasks);
        const thisMonth = toIsoDate(new Date()).slice(0, 7);
        setMonth(months.find((m) => m === thisMonth) ?? months[0]);
      })
      .catch(() => { if (alive) { setFailed(true); setError('목표를 불러오지 못했어요.'); } });
    return () => { alive = false; };
  }, [routineId]);

  /*
    이번 주 몫을 채운 주 N회는 **오늘과 남은 날에서 뺀다.** 주 3회를 월·화·수에
    했으면 목·금·토·일에는 없어야 한다. 지난 날짜는 기록이라 그대로 둔다.

    거른 뒤에 묶어야 **달력의 점과 날짜별 목록이 어긋나지 않는다** — 점은 있는데
    눌러 보면 비어 있는 날이 생기면 사용자는 고장으로 읽는다.
  */
  // 선택 항목은 시작일에 한 행만 있다 — 달력에 찍으면 그날만 뜬금없이 점이 생긴다.
  const shown = useMemo(() => visibleTasks(scheduledTasks(tasks), tasks), [tasks]);
  const byDate = useMemo(() => groupByDate(shown), [shown]);
  const dates = useMemo(() => [...byDate.keys()], [byDate]);
  const months = useMemo(() => monthsOf(tasks), [tasks]);
  const grid = useMemo(() => (month ? monthGrid(month, byDate) : []), [month, byDate]);

  const pickedItems = picked ? byDate.get(picked) ?? [] : [];
  const hint = picked && !pickedItems.length ? nearestDate(dates, picked) : undefined;
  const done = tasks.filter((task) => task.status === 'DONE').length;

  const step = (delta: number) => {
    const next = months[months.indexOf(month ?? '') + delta];
    if (next) { setMonth(next); setPicked(undefined); }
  };

  /**
   * 완료 체크. **되돌릴 수 있게 만든다** — 서버가 거절했는데 화면만 체크된 채로
   * 두면 사용자는 한 줄 알고 넘어간다. ({@code AppState.toggleTask}와 같은 방식)
   */
  const toggle = async (task: RoutineTask) => {
    const next = task.status === 'DONE' ? 'PENDING' : 'DONE';
    setError('');
    setTasks((current) => current.map((t) => (t.taskId === task.taskId ? { ...t, status: next } : t)));
    try {
      await backend.updateTaskStatus(task.taskId, next);
    } catch {
      setTasks((current) => current.map((t) => (t.taskId === task.taskId ? { ...t, status: task.status } : t)));
      setError('완료 상태를 바꾸지 못했어요.');
    }
  };

  if (failed) {
    return (
      <AppScreen navigation contentStyle={styles.content}>
        <Text style={styles.title}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.smallButton}>
          <Text style={styles.smallButtonText}>돌아가기</Text>
        </Pressable>
      </AppScreen>
    );
  }

  if (!detail || !month) {
    return (
      <AppScreen navigation scroll={false} contentStyle={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </AppScreen>
    );
  }

  const at = months.indexOf(month);

  return (
    <AppScreen navigation contentStyle={styles.content}>
      <Text style={styles.title} numberOfLines={2}>{detail.title}</Text>
      <Text style={styles.description}>
        일이 있는 날 {dates.length}일 · 태스크 {done}/{tasks.length}개 완료
      </Text>

      <View style={styles.card}>
        <View style={styles.monthHead}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="이전 달"
            accessibilityState={{ disabled: at <= 0 }}
            onPress={() => step(-1)}
            style={styles.monthStep}
          >
            <Text style={[styles.monthStepText, at <= 0 && styles.monthStepOff]}>‹</Text>
          </Pressable>
          <Text style={styles.monthLabel}>{monthLabel(month)}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="다음 달"
            accessibilityState={{ disabled: at >= months.length - 1 }}
            onPress={() => step(1)}
            style={styles.monthStep}
          >
            <Text style={[styles.monthStepText, at >= months.length - 1 && styles.monthStepOff]}>›</Text>
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}
        </View>

        {grid.map((week, index) => (
          <View key={`${month}-w${index}`} style={styles.weekRow}>
            {week.map((cell, slot) => {
              if (!cell.date) return <View key={`${month}-w${index}-e${slot}`} style={styles.cell} />;
              const all = cell.total > 0 && cell.done === cell.total;
              return (
                <Pressable
                  key={cell.date}
                  accessibilityRole="button"
                  accessibilityLabel={`${dayLabel(cell.date)} · ${cell.total ? `할 일 ${cell.total}개` : '배정 없음'}`}
                  onPress={() => setPicked(cell.date)}
                  style={[styles.cell, picked === cell.date && styles.cellOn]}
                >
                  <Text style={styles.cellDay}>{Number(cell.date.slice(8))}</Text>
                  {/*
                    배정이 있는 날만 점을 찍는다. 다 끝낸 날은 채우고 남은 날은 비운다 —
                    칸마다 숫자를 적으면 달력이 아니라 표가 된다. 배정 없는 날에도
                    **같은 크기의 자리를 남긴다.** 없으면 숫자가 칸마다 위아래로 흔들린다.
                  */}
                  <View style={[styles.dot, cell.total === 0 && styles.dotNone, all && styles.dotDone]} />
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {picked ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{dayLabel(picked)}</Text>
          {pickedItems.length ? (
            // 묶는 규칙은 홈·루틴 화면과 **같은 함수**를 쓴다. 각자 나누면 순서가 갈린다.
            groupByTiming(pickedItems).map((group) => (
              <View key={group.key} style={styles.group}>
                <Text style={styles.groupLabel}>{group.label}</Text>
                {group.items.map((task) => (
                  <Pressable
                    key={task.taskId}
                    accessibilityRole="button"
                    accessibilityLabel={`${task.title} ${task.status === 'DONE' ? '완료 취소' : '완료'}`}
                    onPress={() => toggle(task)}
                    style={[styles.task, task.status === 'DONE' && styles.taskDone]}
                  >
                    <View style={styles.taskCopy}>
                      <Text style={[styles.taskTitle, task.status === 'DONE' && styles.doneText]}>{task.title}</Text>
                      <Text style={styles.meta}>{task.timing}{task.amountLabel ? ` · ${task.amountLabel}` : ''}</Text>
                      {/*
                        주 N회는 그 주의 모든 날에 뜬다. 이 줄이 없으면 사용자가
                        **매일 해야 하는 일로 읽는다.** (V15)
                      */}
                      {(() => {
                        const week = weeklyProgress(task, tasks);
                        return week ? (
                          <Text style={[styles.weekly, week.done >= week.target && styles.weeklyDone]}>
                            이번 주 {week.done}/{week.target}
                            {week.done >= week.target ? ' · 다 했어요' : ''}
                          </Text>
                        ) : null;
                      })()}
                    </View>
                    <View style={[styles.checkbox, task.status === 'DONE' && styles.checkboxDone]}>
                      {task.status === 'DONE' ? <Icon name="check" size={13} color={colors.white} /> : null}
                    </View>
                  </Pressable>
                ))}
              </View>
            ))
          ) : (
            <>
              <Text style={styles.empty}>이 날에는 배정된 일이 없어요.</Text>
              {hint ? (
                <Pressable accessibilityRole="button" onPress={() => setPicked(hint)} style={styles.smallButton}>
                  <Text style={styles.smallButtonText}>가장 가까운 {dayLabel(hint)}로 가기</Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      ) : (
        <Text style={styles.empty}>날짜를 누르면 그날 할 일이 보여요.</Text>
      )}

      {error ? <Text style={styles.notice}>{error}</Text> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.h1, color: colors.text },
  description: { ...typography.caption, color: colors.textTertiary },
  card: { gap: 10, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow },
  monthHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthLabel: { ...typography.label, color: colors.text },
  monthStep: { paddingHorizontal: 14, paddingVertical: 4 },
  monthStepText: { fontSize: 24, lineHeight: 28, color: colors.text },
  monthStepOff: { color: colors.disabled },
  weekRow: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', ...typography.caption, color: colors.textMuted },
  cell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: radius.sm },
  cellOn: { backgroundColor: colors.primaryLight },
  cellDay: { ...typography.caption, color: colors.text },
  dot: { width: 6, height: 6, borderRadius: 3, borderWidth: 1, borderColor: colors.primary },
  dotNone: { borderColor: 'transparent' },
  dotDone: { backgroundColor: colors.primary },
  sectionTitle: { ...typography.label, color: colors.text },
  group: { gap: 8 },
  groupLabel: { ...typography.caption, color: colors.textMuted },
  task: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: 14, borderRadius: radius.md, backgroundColor: colors.surfaceSunken },
  taskDone: { opacity: 0.6 },
  taskCopy: { flex: 1, gap: 4 },
  taskTitle: { ...typography.label, color: colors.text },
  doneText: { textDecorationLine: 'line-through' },
  meta: { ...typography.caption, color: colors.textTertiary },
  weekly: { ...typography.caption, color: colors.primaryPressed },
  weeklyDone: { color: colors.textMuted },
  checkbox: { width: 26, height: 26, borderRadius: 6, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  checkboxDone: { backgroundColor: colors.primary },
  check: { ...typography.label, color: colors.white },
  empty: { ...typography.caption, color: colors.textTertiary, textAlign: 'center' },
  smallButton: { alignSelf: 'flex-start', paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.surfaceSunken },
  smallButtonText: { ...typography.body, color: colors.textTertiary },
  notice: { ...typography.caption, color: colors.textTertiary, textAlign: 'center' },
});
