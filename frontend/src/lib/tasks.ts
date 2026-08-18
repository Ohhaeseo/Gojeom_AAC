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
 * 서버는 AI가 만든 한 주치 구성을 **기간만큼 주 단위로 복제해** 저장한다
 * (`RoutineTxService.persistStandalone`). 6개월짜리 목표면 같은 태스크가 24번
 * 들어 있다. 그대로 그리면 96줄이 나열돼 화면이 쓸모없어진다.
 *
 * 오늘 이전 중 가장 최근 회차를 고르고, 아직 시작 전이면 첫 회차를 보여준다.
 */
function pickRound(tasks: RoutineTask[]): { date?: string; items: RoutineTask[] } {
  const today = toIsoDate(new Date());
  const dates = [...new Set(tasks.map((task) => task.scheduledDate))].sort();
  const date = [...dates].reverse().find((value) => value <= today) ?? dates[0];
  return { date, items: tasks.filter((task) => task.scheduledDate === date) };
}

/**
 * 오늘 할 일.
 *
 * <b>회차는 목표마다 따로 고른다.</b> 목표를 여러 개 골랐을 때 전체에서 날짜
 * 하나를 고르면, 시작일이 다른 목표는 그 날짜에 회차가 없어 **통째로 사라진다.**
 * 목표별로 오늘 회차를 고른 뒤 합치고, 합친 목록을 다시 정렬한다.
 *
 * <b>완료 체크는 회차 단위다.</b> 오늘 체크하면 그 주가 완료로 기록된다.
 * 날짜별로 따로 체크하려면 태스크를 일 단위로 쪼개야 한다.
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
    items.push(...round.items);
  }
  return { date, items: items.sort(compareTasks) };
}
