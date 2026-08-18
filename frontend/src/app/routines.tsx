import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';



import { AppScreen } from '@/components/layout/AppScreen';
import { AnimatedSwitch } from '@/components/ui/AnimatedSwitch';
import { FormField } from '@/components/ui/FormField';
import { DragList } from '@/components/ui/DragList';
import { GoModal } from '@/components/ui/GoModal';
import { checkTime, formatAnalyzedDate, formatTimeInput, toApiTime, toTimeDigits } from '@/lib/date';
import { groupByTiming, todayTasks } from '@/lib/tasks';
import type { RoutineSummary } from '@/services/backend';
import { WEEKS_PER_MONTH, useAppState } from '@/state/AppState';
import { colors, radius, shadow, spacing, typography } from '@/theme/tokens';
import type { Category } from '@/types/api';

/**
 * 루틴 화면 — 경로 A·B로 만든 목표를 함께 다룬다. (API.md §6.6)
 *
 * **분석이 없어도 여기서 목표를 만들 수 있다.** 목록이 비어 있으면 두 갈래를 모두
 * 제시한다 — 저장한 진단 결과로 만들거나, 진단 없이 카테고리만 골라 만들거나.
 */
const categoryLabel = { SKIN: '피부', BODY: '체형', HEALTH: '건강' } as const;
const period = (value: string | null) => (value ?? '').replaceAll('-', '.');

/**
 * 목록을 카테고리로 묶는다. 목표가 여러 개면 피부·체형·건강이 뒤섞여
 * 무엇이 무엇인지 알기 어렵다.
 *
 * **진단 기반 목표는 카테고리가 없어(`null`) 맨 뒤에 따로 모은다.**
 * 여러 카테고리에 걸쳐 있어서 어느 묶음에도 넣을 수 없다.
 */
const GROUPS: { key: Category | null; label: string }[] = [
  { key: 'SKIN', label: '피부' },
  { key: 'BODY', label: '체형' },
  { key: 'HEALTH', label: '건강' },
  { key: null, label: '진단 기반' },
];

type CardProps = {
  item: RoutineSummary;
  selected: boolean;
  /** 펼쳐진 카드에만 진행률 바를 그린다. */
  progress?: number;
  /** 지금 끌고 있는 카드인지. 들어올린 느낌을 준다. */
  dragging?: boolean;
  /** 순서 조작 UI(끌기 손잡이 + 위·아래). 목표가 하나뿐이면 없다. */
  controls?: ReactNode;
  onSelect: () => void;
  onRename: () => void;
  onRemove: () => void;
  /** 알림 시각 편집 열기. */
  onNotify: () => void;
  /** 이 목표에 실제로 적용되는 알림 시각 `HH:mm`. */
  notifyAt: string;
  /** 목표가 자기 시각을 갖고 있는지. 아니면 기본 시각을 따르는 중이다. (V12) */
  notifyOwn: boolean;
};

/**
 * 목표 카드.
 *
 * **카드를 누르면 펼쳐지고, 이름 변경·삭제는 형제로 뺐다.** 카드 안에 넣으면
 * 누를 때 이벤트가 카드로 올라가 함께 발동한다. (오답 노트 N-11)
 */
function RoutineCard({ item, selected, progress, dragging, controls, onSelect, onRename, onRemove, onNotify, notifyAt, notifyOwn }: CardProps) {
  return (
    <View style={[styles.card, selected && styles.cardOn, dragging && styles.cardDragging]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${item.title} 선택`} onPress={onSelect} style={styles.cardBody}>
        <View style={styles.cardHead}>
          <View style={styles.chip}><Text style={styles.chipText}>{item.category ? categoryLabel[item.category] : '진단 기반'}</Text></View>
          {/* 개월 환산은 WEEKS_PER_MONTH 하나로 맞춘다. 백엔드 RoutinePolicy와 같은 값이다. */}
          <Text style={styles.cardMeta}>{item.durationWeeks ? `${Math.round(item.durationWeeks / WEEKS_PER_MONTH)}개월` : '기간 없음'}</Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        {/* 사용자가 적은 목표를 다시 보여준다. 만들 때만 쓰고 감추면 "내가 뭘 목표로 했더라"를 알 수 없다. */}
        {item.goalText ? <Text style={styles.goalText} numberOfLines={2}>“{item.goalText}”</Text> : null}
        <Text style={styles.cardMeta}>
          {period(item.startDate)}{item.endDate ? ` — ${period(item.endDate)}` : ''} · 태스크 {item.taskCount}개
          {item.targetWeightKg != null ? ` · 목표 ${item.targetWeightKg}kg` : ''}
        </Text>
        {progress != null ? <View style={styles.track}><View style={[styles.fill, { width: `${progress}%` }]} /></View> : null}
        {/*
          식사 방향은 **펼친 카드에만** 보여준다. 목록에서 모든 카드가 두세 줄씩
          늘어나면 목표를 훑어보기 어려워진다. 일반 가이드라는 것을 라벨로 밝힌다.
        */}
        {selected && item.dietGuide ? (
          <View style={styles.diet}>
            <Text style={styles.dietLabel}>식사 방향</Text>
            <Text style={styles.dietText}>{item.dietGuide}</Text>
          </View>
        ) : null}
        {/*
          이 목표에 **실제로 적용되는** 시각을 보여준다. 목표가 자기 값을 갖고
          있지 않으면 기본 시각을 따르는 중이라는 것을 밝힌다 — 빈칸으로 두면
          "알림이 없다"로 읽힌다. (V12)
        */}
        {selected ? (
          <Text style={styles.notifyLine}>
            알림 {notifyAt}{notifyOwn ? '' : ' · 기본 시각을 따르는 중'}
          </Text>
        ) : null}
      </Pressable>
      {/*
        순서 조작은 카드 Pressable **밖**이다. 안에 넣으면 끌거나 누를 때 이벤트가
        카드로 올라가 카드가 함께 눌린다. (오답 노트 N-11)
      */}
      <View style={styles.cardActions}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${item.title} 이름 바꾸기`} onPress={onRename} style={styles.cardAction}>
          <Text style={styles.cardActionText}>이름 바꾸기</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`${item.title} 알림 시각 바꾸기`} onPress={onNotify} style={styles.cardAction}>
          <Text style={styles.cardActionText}>알림 시각</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`${item.title} 삭제`} onPress={onRemove} style={styles.cardAction}>
          <Text style={[styles.cardActionText, styles.cardActionDanger]}>삭제</Text>
        </Pressable>
        {controls}
      </View>
    </View>
  );
}

export default function RoutinesScreen() {
  const {
    routines, loadRoutines, openRoutine, tasks, toggleTask, loadDrawer, activeRoutineId,
    renameRoutine, deleteRoutine, reorderRoutines,
    notificationSettings, loadNotificationSettings, updateNotificationSettings, setRoutineNotifyTime,
  } = useAppState();
  const [selectedId, setSelectedId] = useState<string | undefined>(activeRoutineId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [renaming, setRenaming] = useState<RoutineSummary>();
  const [removing, setRemoving] = useState<RoutineSummary>();
  const [nameDraft, setNameDraft] = useState('');
  const [notifying, setNotifying] = useState<RoutineSummary>();
  // 숫자만 들고 있다가 보낼 때 HH:mm으로 바꾼다. (`lib/date`)
  const [timeDraft, setTimeDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const commitRename = async () => {
    if (!renaming) return;
    setBusy(true);
    const outcome = await renameRoutine(renaming.routineId, nameDraft);
    setBusy(false); setRenaming(undefined);
    if (!outcome.ok) setError(outcome.message ?? '목표 이름을 바꾸지 못했어요.');
  };

  /**
   * 알림 시각 저장. `undefined`를 보내면 기본 시각을 따르도록 되돌린다.
   *
   * <b>비우고 저장하면 지우는 것</b>이다. "정하지 않음"과 "지움"을 따로 둘 이유가
   * 없어 같은 동작으로 묶었다. (V12)
   */
  const commitNotify = async (clear = false) => {
    if (!notifying) return;
    setBusy(true);
    const outcome = await setRoutineNotifyTime(
      notifying.routineId,
      clear ? undefined : toApiTime(timeDraft),
    );
    setBusy(false); setNotifying(undefined);
    if (!outcome.ok) setError(outcome.message ?? '알림 시각을 바꾸지 못했어요.');
  };

  /**
   * 한 묶음의 순서가 바뀌면 전체 순서를 다시 만들어 보낸다.
   *
   * 서버는 전체를 받는다. 바뀐 묶음의 새 순서를 그 자리에 끼우고 나머지는
   * 원래 순서를 유지한다.
   */
  const commitOrder = async (group: Category | null, ordered: RoutineSummary[]) => {
    const ids: string[] = [];
    let cursor = 0;
    for (const item of routines) {
      if (item.category === group) ids.push(ordered[cursor++]!.routineId);
      else ids.push(item.routineId);
    }
    const outcome = await reorderRoutines(ids);
    if (!outcome.ok) setError(outcome.message ?? '순서를 저장하지 못했어요.');
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
  /** 켜는 데는 성공했지만 이 기기로는 못 받을 수 있다. 그 사유를 그대로 띄운다. */
  const applyNotify = async (enabled: boolean) => {
    const outcome = await updateNotificationSettings({ enabled });
    setError(outcome.ok ? (outcome.message ?? '') : (outcome.message ?? '알림 설정을 저장하지 못했어요.'));
  };

  const timeCheck = checkTime(timeDraft);
  const today = todayTasks(tasks);

  return (
    // `DragList`는 가상 목록이 아니라 그냥 View라 AppScreen의 ScrollView 안에
    // 그대로 넣어도 된다. 중첩 리스트 경고도 나지 않는다.
    <AppScreen navigation contentStyle={styles.content}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>내 루틴</Text>
        <Pressable onPress={() => router.push('/routine-new')} style={styles.addBtn}><Text style={styles.addText}>+ 새 목표</Text></Pressable>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/*
        카테고리로 묶어 보여준다. 목표가 여러 개면 피부·체형·건강이 뒤섞여
        무엇이 무엇인지 알기 어렵다. **묶음 안의 순서는 사용자가 정한 순서**를
        그대로 따른다(서버가 sort_order로 정렬해 준다).

        진단 기반 목표는 카테고리가 없어 맨 뒤에 따로 모은다.
      */}
      {GROUPS.map((group) => {
        const items = routines.filter((item) => item.category === group.key);
        if (!items.length) return null;
        return (
          <View key={group.key ?? 'ANALYSIS'} style={styles.group}>
            <View style={styles.groupHead}>
              <Text style={styles.groupTitle}>{group.label}<Text style={styles.groupCount}> {items.length}</Text></Text>
              {items.length > 1 ? <Text style={styles.groupHint}>끌거나 ▲▼로 순서 변경</Text> : null}
            </View>
            {/*
              **묶음 안에서만 순서를 바꾼다.** 카테고리를 넘나들면 목표의 카테고리가
              바뀐 것처럼 보이는데, 카테고리는 만들 때 정해지고 나중에 바뀌지 않는다.
              서버에는 전체 순서를 보내야 하므로 바뀐 묶음만 갈아끼워 합친다.
            */}
            <DragList
              data={items}
              keyOf={(item) => item.routineId}
              onReorder={(next) => void commitOrder(group.key, next)}
              renderItem={(item, dragging, controls) => (
                <RoutineCard
                  item={item}
                  selected={item.routineId === current?.routineId}
                  progress={item.routineId === current?.routineId && tasks.length ? Math.round((done / tasks.length) * 100) : undefined}
                  dragging={dragging}
                  controls={items.length > 1 ? controls : null}
                  onSelect={() => select(item.routineId)}
                  onRename={() => { setRenaming(item); setNameDraft(item.title); }}
                  onRemove={() => setRemoving(item)}
                  onNotify={() => { setNotifying(item); setTimeDraft(toTimeDigits(item.notifyTime)); }}
                  notifyAt={item.notifyTime ?? notificationSettings.defaultTime}
                  notifyOwn={item.notifyTime != null}
                />
              )}
            />
          </View>
        );
      })}

      <Text style={styles.sectionTitle}>오늘 할 일</Text>
      <Text style={styles.description}>{today.date ? `${formatAnalyzedDate(today.date)} 회차 · ` : ''}오늘 {today.items.length}개 · 전체 {tasks.length}개 중 {done}개 완료</Text>
      {/* 묶는 규칙도 홈과 **같은 함수**를 쓴다. 각자 나누면 두 화면의 순서가 갈린다. */}
      {today.items.length ? groupByTiming(today.items).map((group) => (
        <View key={group.key}>
          <Text style={styles.groupLabel}>{group.label}</Text>
          {group.items.map((task) => (
            <Pressable key={task.taskId} onPress={() => toggleTask(task.taskId)} style={[styles.task, task.status === 'DONE' && styles.taskDone]}>
              <View style={styles.taskCopy}>
                <Text style={[styles.taskTitle, task.status === 'DONE' && styles.doneText]}>{task.title}</Text>
                {/* 소요 시간(durationLabel)은 빼고 시점과 분량만 남긴다. */}
                <Text style={styles.meta}>{task.timing}{task.amountLabel ? ` · ${task.amountLabel}` : ''}</Text>
              </View>
              <View style={styles.completeRow}><View style={[styles.checkbox, task.status === 'DONE' && styles.checkboxDone]}><Text style={styles.check}>{task.status === 'DONE' ? '✓' : ''}</Text></View><Text style={styles.completeText}>완료</Text></View>
            </Pressable>
          ))}
        </View>
      )) : <Text style={styles.description}>태스크를 불러오는 중이에요.</Text>}

      <Text style={styles.sectionTitle}>알림 설정</Text>
      <Text style={styles.description}>설정한 시간에 루틴 알림을 받을게요.</Text>
      <View style={styles.alarm}>
        <View><Text style={styles.taskTitle}>루틴 알림</Text><Text style={styles.meta}>매일 {notificationSettings.defaultTime}</Text></View>
        <AnimatedSwitch accessibilityLabel="루틴 알림" value={notificationSettings.enabled} onValueChange={(enabled) => void applyNotify(enabled)} />
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

      {/*
        목표별 알림 시각. (V12)

        **켜고 끄는 것은 여기 없다** — on/off는 사용자 단위라 아래 "알림 설정"
        토글 하나가 갖는다. 목표마다 두면 "전체는 껐는데 목표는 켜져 있다"는
        상태가 생긴다.
      */}
      <GoModal
        visible={Boolean(notifying)}
        title="알림 시각"
        description={`"${notifying?.title ?? ''}"의 알림을 받을 시각이에요. 비워두면 기본 시각(${notificationSettings.defaultTime})을 따라요.`}
        confirmLabel={busy ? '저장 중...' : '저장하기'}
        confirmDisabled={!timeCheck.ok || busy}
        onClose={() => setNotifying(undefined)}
        onConfirm={() => void commitNotify()}
      >
        <FormField
          value={formatTimeInput(timeDraft)}
          onChangeText={(value) => setTimeDraft(value.replace(/\D/g, '').slice(0, 4))}
          keyboardType="number-pad"
          placeholder="예) 07:30"
          error={timeCheck.message}
          autoFocus
        />
        {/*
          되돌리는 길을 확인 버튼과 **따로** 둔다. 입력을 지우고 저장하는 것으로
          대신하면 "빈칸 = 지움"을 사용자가 알아내야 한다.
        */}
        <Pressable accessibilityRole="button" onPress={() => void commitNotify(true)} disabled={busy} style={styles.clearNotify}>
          <Text style={styles.clearNotifyText}>기본 시각 따르기</Text>
        </Pressable>
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
  cardActions: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.divider },
  cardAction: { flex: 1, alignItems: 'center', paddingVertical: 11 },
  cardActionText: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  cardActionDanger: { color: colors.danger },
  counter: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  group: { gap: spacing.sm },
  groupTitle: { ...typography.label, color: colors.textTertiary, marginTop: 4 },
  groupCount: { color: colors.primary, fontWeight: '700' },
  goalText: { ...typography.caption, color: colors.textTertiary, fontStyle: 'italic' },
  groupLabel: { ...typography.caption, color: colors.textTertiary, marginTop: 10, marginBottom: 2 },
  notifyLine: { ...typography.caption, color: colors.textMuted },
  clearNotify: { alignSelf: 'center', paddingVertical: 8 },
  clearNotifyText: { ...typography.caption, color: colors.textMuted, textDecorationLine: 'underline' },
  diet: { gap: 3, marginTop: 6, padding: 10, borderRadius: radius.md, backgroundColor: colors.surfaceSunken },
  dietLabel: { ...typography.caption, color: colors.primaryPressed, fontWeight: '700' },
  dietText: { ...typography.caption, color: colors.textTertiary, lineHeight: 18 },
  groupHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  groupHint: { ...typography.caption, color: colors.textMuted },
  handleSlot: { paddingRight: 8 },
  cardDragging: { opacity: 0.92, transform: [{ scale: 1.02 }] },
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
