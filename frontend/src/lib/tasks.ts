import { toIsoDate } from '@/lib/date';
import type { RoutineTask } from '@/types/api';

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

export function timingRank(timing: string): number {
  const found = TIMING_ORDER.find((entry) => entry.keywords.some((word) => timing.includes(word)));
  return found ? found.rank : 1.5;
}

/** `"주 3회 저녁"`에서 3을 뽑는다. 빈도 표기가 없으면 매일이다. */
const WEEKLY = /주\s*([1-7])\s*회/;

/**
 * 반복 빈도 순위. **자주 반복하는 것일수록 위로 온다.**
 *
 * 매일 해야 하는 일이 주 3회짜리보다 먼저 눈에 들어와야 한다 — 주기적으로 계속
 * 해야 하는 것이 루틴의 뼈대이고, 가끔 하는 것은 그 사이에 끼는 일이다.
 *
 * 프롬프트는 빈도가 섞일 때만 `timing`에 `"주 3회 저녁"`처럼 적게 되어 있다
 * (`RoutineGenerationPrompt` 태스크 구성 규칙). 그래서 **표기가 없으면 매일**이다.
 * 주 N회끼리는 N이 큰 쪽이 위다.
 */
export function frequencyRank(timing: string): number {
  const matched = timing.match(WEEKLY);
  if (!matched) return 0;
  return 1 + (7 - Number(matched[1])) / 10;
}

/**
 * 목록 순서 — **빈도 먼저, 그 다음 시점.**
 *
 * 빈도로 먼저 가르면 매일 하는 일이 위에 모이고(피드백 5번), 그 안에서는
 * 아침 → 자기 전으로 하루가 흐른다. 목표를 여러 개 골랐을 때도 같은 규칙이라
 * 목표별로 뭉치지 않고 **시점끼리 섞여** 나열된다. (피드백 7번)
 */
function compareTasks(a: RoutineTask, b: RoutineTask): number {
  const byFrequency = frequencyRank(a.timing) - frequencyRank(b.timing);
  if (byFrequency !== 0) return byFrequency;
  return timingRank(a.timing) - timingRank(b.timing);
}

/**
 * 한 목표 안에서 오늘에 해당하는 회차를 고른다.
 *
 * 서버는 AI가 만든 한 주치 구성을 **기간 안의 날짜마다** 펼쳐 저장한다
 * (`TaskScheduleExpander`, V15). 6개월짜리 목표면 같은 태스크가 180번 들어 있다.
 * 그대로 그리면 화면이 쓸모없어진다.
 *
 * 오늘 것을 고르고, 아직 시작 전이면 첫날을 보여준다.
 */
function pickRound(tasks: RoutineTask[]): { date?: string; items: RoutineTask[] } {
  const today = toIsoDate(new Date());
  const dates = [...new Set(tasks.map((task) => task.scheduledDate))].sort();
  const date = [...dates].reverse().find((value) => value <= today) ?? dates[0];
  return { date, items: tasks.filter((task) => task.scheduledDate === date) };
}

/**
 * 이번 주 몫을 **이미 채운** 주 N회 태스크인가.
 *
 * 🔴 V15는 주 N회짜리도 **그 주 모든 날에** 행을 만든다 — 어느 날 할지는 사용자가
 * 그 주 안에서 고른다(월·수·금으로 박아 두면 월요일에 못 한 사람은 그 회차를 영영
 * 잃는다). 그런데 화면이 "이번 주 3/3 · 다 했어요"라고 **말만 하고 목록에서 빼지
 * 않아서**, 월·화·수에 세 번 채운 주 3회 루틴이 목·금·토·일에도 계속 떴다.
 *
 * **자기 자신이 완료된 줄은 남긴다.** 체크하는 순간 사라지면 되돌릴 수 없고,
 * 오늘 해낸 일이 오늘 목록에서 없어지는 것도 이상하다.
 */
export function weeklyQuotaMet(task: RoutineTask, all: RoutineTask[]): boolean {
  if (task.status === 'DONE') return false;
  const week = weeklyProgress(task, all);
  return week ? week.done >= week.target : false;
}

/**
 * 화면에 남길 것만 고른다.
 *
 * 주 3회를 월·화·수에 채웠으면 목·금·토·일에는 뜨지 않아야 한다 — 그것이 "주 3회"다.
 *
 * **지난 날짜는 그대로 둔다.** 캘린더에서 지난 날은 <b>기록</b>이라, 빼 버리면
 * 그날 무엇이 있었는지 볼 수 없게 된다. 오늘과 앞으로 남은 날에서만 덜어낸다.
 *
 * @param all 세는 기준. **거른 목록이 아니라 전체**를 넘겨야 주별 횟수가 맞는다
 */
export function visibleTasks(
  tasks: RoutineTask[],
  all: RoutineTask[],
  today = toIsoDate(new Date()),
): RoutineTask[] {
  return tasks.filter((task) => task.scheduledDate < today || !weeklyQuotaMet(task, all));
}

/**
 * 오늘 할 일.
 *
 * <b>회차는 목표마다 따로 고른다.</b> 목표를 여러 개 골랐을 때 전체에서 날짜
 * 하나를 고르면, 시작일이 다른 목표는 그 날짜에 회차가 없어 **통째로 사라진다.**
 * 목표별로 오늘 회차를 고른 뒤 합치고, 합친 목록을 다시 정렬한다.
 *
 * <b>완료 체크는 날짜 단위다.</b> 주 N회짜리는 그 주의 모든 날에 배정이 있고
 * 그중 N개를 체크하면 채워진다 — 진행은 {@link weeklyProgress}가 센다. (V15)
 *
 * <b>이번 주 몫을 채운 것은 빠진다.</b> {@link visibleTasks} 참고.
 *
 * <p><b>홈과 루틴 화면이 이 함수를 함께 쓴다.</b> 각자 고르고 정렬하면 같은
 * 태스크가 두 화면에서 다른 순서로 나온다.
 */
export function todayTasks(tasks: RoutineTask[]): { date?: string; items: RoutineTask[] } {
  if (!tasks.length) return { items: [] };

  // `routineId`는 여러 목표를 합쳐 올릴 때 화면이 붙여 준다. 하나만 볼 때는
  // 없을 수 있고, 그때는 전체가 한 묶음이다.
  const groups = new Map<string, RoutineTask[]>();
  for (const task of tasks) {
    const key = task.routineId ?? '';
    const bucket = groups.get(key);
    if (bucket) bucket.push(task);
    else groups.set(key, [task]);
  }

  const items: RoutineTask[] = [];
  let date: string | undefined;
  for (const bucket of groups.values()) {
    const round = pickRound(bucket);
    // 묶음이 하나면 그 회차 날짜가 곧 화면이 말하는 날짜다. 여럿이면 목표마다
    // 달라 하나로 말할 수 없으므로 비워 둔다.
    date = groups.size === 1 ? round.date : undefined;
    // 세는 기준은 **전체 목록**이다. 회차만 넘기면 그 주의 다른 날 완료가 빠져
    // 이미 채운 루틴이 다시 뜬다.
    items.push(...visibleTasks(round.items, tasks));
  }
  return { date, items: items.sort(compareTasks) };
}

/**
 * 시점 묶음. 라벨은 `timingRank`가 매기는 순위와 짝이다.
 *
 * `rank`가 없는 것(`1.5`)은 **시점 구분이 없는 일**이다 — "물 자주 마시기"처럼
 * 하루 중 언제라고 말할 수 없는 것들이라 맨 위에 따로 모은다.
 */
export type TaskGroup = { key: string; label: string; items: RoutineTask[] };

const GROUP_LABEL: { rank: number; key: string; label: string }[] = [
  { rank: 0, key: 'MORNING', label: '아침' },
  { rank: 1, key: 'NOON', label: '점심' },
  { rank: 2, key: 'EVENING', label: '저녁' },
  { rank: 3, key: 'NIGHT', label: '자기 전' },
];

/** 시점 구분이 없는 묶음. 하루 내내 걸쳐 있어 맨 위에 둔다. */
const ANYTIME = { rank: 1.5, key: 'ANYTIME', label: '수시로' };

/**
 * 오늘 할 일을 **시점별로 나눈다.**
 *
 * <b>시점 구분이 없는 것이 맨 위</b>고, 그 아래로 아침 → 점심 → 저녁 → 자기 전이다.
 * 그냥 나열하면 아침에 할 일과 자기 전에 할 일이 한 덩어리로 보여 "지금 뭘 해야
 * 하는지"를 눈으로 골라내야 한다.
 *
 * 묶음 안의 순서는 {@link todayTasks}가 매긴 그대로다 — 자주 반복하는 것이 위다.
 * <b>비어 있는 묶음은 내보내지 않는다.</b> 제목만 있고 아래가 빈 칸은 없느니만 못하다.
 */
export function groupByTiming(items: RoutineTask[]): TaskGroup[] {
  // ANYTIME의 rank는 1.5(모르는 것을 중간에 두는 값)라 그대로 정렬하면 점심과
  // 저녁 사이로 간다. **맨 앞에 못 박는다.**
  return [ANYTIME, ...GROUP_LABEL]
    .map((group) => ({
      key: group.key,
      label: group.label,
      items: items.filter((task) => timingRank(task.timing) === group.rank),
    }))
    .filter((group) => group.items.length > 0);
}

/**
 * 주 N회 태스크의 그 주 진행. (V15)
 *
 * **주 3회짜리는 그 주의 모든 날에 배정이 있다.** 그중 3개를 체크하면 채워진 것이라,
 * 날짜 하나만 보고 "했다/안 했다"로 말할 수 없다. 같은 주의 같은 태스크를 모아 센다.
 *
 * 같은 태스크인지는 `title + timing`으로 가른다 — `TaskTimingSplitter`가 시점마다
 * 나누므로 한 목표 안에서 이 둘의 짝은 유일하다. 서버의 진행률 집계와 같은 기준이다.
 *
 * @returns 매일 하는 일이면 `undefined`. 셀 것이 없다.
 */
export function weeklyProgress(
  task: RoutineTask,
  all: RoutineTask[],
): { done: number; target: number } | undefined {
  if (!task.weeklyTarget) return undefined;

  const sameWeek = all.filter((other) =>
    other.title === task.title
    && other.timing === task.timing
    && other.weekStart === task.weekStart
    && other.routineId === task.routineId);

  // 넷째 날을 더 체크했다고 4/3이 되면 안 된다.
  const done = Math.min(sameWeek.filter((t) => t.status === 'DONE').length, task.weeklyTarget);
  return { done, target: task.weeklyTarget };
}
