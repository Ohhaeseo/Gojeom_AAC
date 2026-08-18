import type { RoutineTask } from '@/types/api';

/**
 * 목표 캘린더의 계산부. 화면은 그리기만 하고 판단은 여기서 한다.
 *
 * **날짜는 처음부터 끝까지 `YYYY-MM-DD` 문자열로 다룬다.** `Date`로 바꿔 더하고 빼면
 * 시간대에 따라 하루가 밀린다 — 서버는 `scheduled_date`를 날짜로만 주고, 사용자에게도
 * 날짜로만 보인다. 중간에 시각을 끼워 넣을 이유가 없다.
 *
 * 조각을 꺼낼 때 `split`이 아니라 `slice`를 쓰는 것도 같은 이유의 연장이다 —
 * 자리 수가 고정된 형식이라 자를 위치가 정해져 있고, 배열 인덱스를 거치지 않아
 * `noUncheckedIndexedAccess` 아래에서도 값이 `number`로 남는다.
 */

export type CalendarCell = {
  /** 이 달에 속하지 않는 칸은 빈 문자열이다. */
  date: string;
  /** 그날 배정된 태스크 수. */
  total: number;
  /** 그중 완료한 수. */
  done: number;
};

/** 달력 한 주. 항상 7칸이다. */
export type CalendarWeek = CalendarCell[];

const CELLS = 42;
const EMPTY: CalendarCell = { date: '', total: 0, done: 0 };

const yearOf = (value: string) => Number(value.slice(0, 4));
const monthOf = (value: string) => Number(value.slice(5, 7));
const dayOf = (value: string) => Number(value.slice(8, 10));

/** `YYYY-MM` 조각. */
export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function groupByDate(tasks: RoutineTask[]): Map<string, RoutineTask[]> {
  const byDate = new Map<string, RoutineTask[]>();
  for (const task of tasks) {
    const bucket = byDate.get(task.scheduledDate);
    if (bucket) bucket.push(task);
    else byDate.set(task.scheduledDate, [task]);
  }
  return byDate;
}

/**
 * 태스크가 실제로 놓인 범위. **목표의 기간이 아니라 일이 있는 범위다.**
 *
 * 서버의 목표 상세에는 `startDate`·`endDate`가 없고, 있더라도 일이 없는 달까지
 * 달력을 넘기게 만들 이유가 없다.
 */
export function taskRange(tasks: RoutineTask[]): { first: string; last: string } | undefined {
  let first: string | undefined;
  let last: string | undefined;
  for (const task of tasks) {
    if (first === undefined || task.scheduledDate < first) first = task.scheduledDate;
    if (last === undefined || task.scheduledDate > last) last = task.scheduledDate;
  }
  return first !== undefined && last !== undefined ? { first, last } : undefined;
}

/** 앞뒤로 넘길 수 있는 달 목록. 일이 있는 달만 만든다. */
export function monthsOf(tasks: RoutineTask[]): string[] {
  const range = taskRange(tasks);
  if (!range) return [];

  const months: string[] = [];
  const last = monthKey(range.last);
  let year = yearOf(range.first);
  let month = monthOf(range.first);

  // 120개는 10년치다. 데이터가 이상해도 무한히 돌지 않게 하는 빗장일 뿐이다.
  for (let i = 0; i < 120; i++) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    months.push(key);
    if (key >= last) break;
    if (month === 12) { year += 1; month = 1; } else { month += 1; }
  }
  return months;
}

/**
 * 한 달치 6주 격자. 첫 칸은 일요일이다.
 *
 * 주 수를 6으로 고정하는 이유 — 달마다 5주·6주로 바뀌면 달을 넘길 때 격자 높이가
 * 출렁여 그 아래 목록이 위아래로 뛴다.
 */
export function monthGrid(month: string, byDate: Map<string, RoutineTask[]>): CalendarWeek[] {
  const year = yearOf(month);
  const mon = monthOf(month);
  // `Date.UTC`로 만든다. 지역 시간대로 만들면 달의 첫날이 전날로 밀리는 곳이 있다.
  const leading = new Date(Date.UTC(year, mon - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, mon, 0)).getUTCDate();

  const cells: CalendarCell[] = [];
  for (let i = 0; i < leading; i++) cells.push({ ...EMPTY });
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${month}-${String(day).padStart(2, '0')}`;
    const items = byDate.get(date) ?? [];
    cells.push({
      date,
      total: items.length,
      done: items.filter((task) => task.status === 'DONE').length,
    });
  }
  while (cells.length < CELLS) cells.push({ ...EMPTY });

  const weeks: CalendarWeek[] = [];
  for (let week = 0; week < 6; week++) weeks.push(cells.slice(week * 7, week * 7 + 7));
  return weeks;
}

/**
 * 배정이 없는 날을 눌렀을 때 안내할 **가장 가까운** 날.
 *
 * 빈 날에 아무 말도 하지 않으면 사용자는 앱이 멈춘 줄 안다. 지금 일정은 회차가
 * 드문드문 놓여 있어(주 단위 복제) 빈 날이 훨씬 많다.
 */
export function nearestDate(dates: string[], target: string): string | undefined {
  let best: string | undefined;
  let bestGap = Number.POSITIVE_INFINITY;
  for (const date of dates) {
    // **문자열 비교로 재지 않는다.** "08-31과 09-01"이 멀다고 나온다.
    const gap = Math.abs(dayNumber(date) - dayNumber(target));
    if (gap < bestGap || (gap === bestGap && best !== undefined && date < best)) {
      bestGap = gap;
      best = date;
    }
  }
  return best;
}

/** 두 날짜의 거리를 재기 위한 일련번호. */
function dayNumber(date: string): number {
  return Date.UTC(yearOf(date), monthOf(date) - 1, dayOf(date)) / 86_400_000;
}

/** `2026-08-18` → `8월 18일`. */
export function dayLabel(date: string): string {
  return `${monthOf(date)}월 ${dayOf(date)}일`;
}

/** `2026-08` → `2026년 8월`. */
export function monthLabel(month: string): string {
  return `${yearOf(month)}년 ${monthOf(month)}월`;
}
