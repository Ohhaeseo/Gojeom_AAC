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
 *
 * <p><b>홈과 루틴 화면이 이 함수를 함께 쓴다.</b> 각자 고르고 정렬하면 같은
 * 태스크가 두 화면에서 다른 순서로 나온다.
 */
export function todayTasks(tasks: RoutineTask[]): { date?: string; items: RoutineTask[] } {
  if (!tasks.length) return { items: [] };
  const today = toIsoDate(new Date());
  const dates = [...new Set(tasks.map((task) => task.scheduledDate))].sort();
  const date = [...dates].reverse().find((value) => value <= today) ?? dates[0];
  const items = tasks
    .filter((task) => task.scheduledDate === date)
    .sort((a, b) => timingRank(a.timing) - timingRank(b.timing));
  return { date, items };
}
