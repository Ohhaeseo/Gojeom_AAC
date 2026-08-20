import { dayLabel, groupByDate, monthGrid, monthLabel, monthsOf, nearestDate, taskRange } from '@/lib/calendar';
import type { RoutineTask } from '@/types/api';

/**
 * 목표 캘린더의 계산부.
 *
 * 날짜 계산은 **시간대 때문에 하루씩 밀리는 것**이 고전적인 함정이라, 달의 첫날과
 * 마지막 날을 특히 본다.
 */

const task = (scheduledDate: string, status: RoutineTask['status'] = 'PENDING'): RoutineTask => ({
  taskId: scheduledDate + status,
  category: 'BODY',
  importance: 'CORE',
  title: '스쿼트 하기',
  timing: '매일 아침',
  durationLabel: '',
  amountLabel: '15회 2세트',
  scheduledDate,
  status,
});

/** `noUncheckedIndexedAccess` 아래에서 인덱스 접근이 undefined로 새지 않게 한다. */
const at = <T,>(items: T[], index: number): T => {
  const value = items[index];
  if (value === undefined) throw new Error(`${index}번 칸이 없다`);
  return value;
};

describe('monthGrid', () => {
  it('달의 첫날이 올바른 요일 칸에 들어간다', () => {
    // 2026-08-01은 토요일이다. 앞에 빈 칸 6개가 와야 한다.
    const grid = monthGrid('2026-08', new Map());

    expect(at(grid, 0).slice(0, 6).every((cell) => cell.date === '')).toBe(true);
    expect(at(at(grid, 0), 6).date).toBe('2026-08-01');
  });

  it('달의 마지막 날이 빠지지 않는다', () => {
    const dates = monthGrid('2026-08', new Map()).flat().map((cell) => cell.date).filter(Boolean);

    expect(dates).toHaveLength(31);
    expect(at(dates, 30)).toBe('2026-08-31');
  });

  it('2월과 윤년을 제대로 센다', () => {
    const days = (month: string) =>
      monthGrid(month, new Map()).flat().filter((cell) => cell.date).length;

    expect(days('2026-02')).toBe(28);
    expect(days('2028-02')).toBe(29);
  });

  it('주 수를 6으로 고정한다', () => {
    // 달마다 5주·6주로 바뀌면 달을 넘길 때 그 아래 목록이 위아래로 뛴다.
    for (const month of ['2026-02', '2026-08', '2026-11']) {
      const grid = monthGrid(month, new Map());
      expect(grid).toHaveLength(6);
      expect(grid.every((week) => week.length === 7)).toBe(true);
    }
  });

  it('날짜별 배정 수와 완료 수를 센다', () => {
    const byDate = groupByDate([
      task('2026-08-03', 'DONE'),
      task('2026-08-03'),
      task('2026-08-10'),
    ]);
    const cells = monthGrid('2026-08', byDate).flat();

    const third = cells.find((cell) => cell.date === '2026-08-03');
    expect(third).toMatchObject({ total: 2, done: 1 });
    expect(cells.find((cell) => cell.date === '2026-08-10')).toMatchObject({ total: 1, done: 0 });
    // 배정이 없는 날은 0이다. 빈칸과 구분돼야 한다.
    expect(cells.find((cell) => cell.date === '2026-08-04')).toMatchObject({ total: 0, done: 0 });
  });
});

describe('monthsOf', () => {
  it('일이 있는 달만 만든다', () => {
    expect(monthsOf([task('2026-08-20'), task('2026-09-03')])).toEqual(['2026-08', '2026-09']);
  });

  it('해를 넘겨도 이어진다', () => {
    expect(monthsOf([task('2026-11-30'), task('2027-01-04')]))
      .toEqual(['2026-11', '2026-12', '2027-01']);
  });

  it('태스크가 없으면 빈 목록이다', () => {
    expect(monthsOf([])).toEqual([]);
    expect(taskRange([])).toBeUndefined();
  });
});

describe('nearestDate', () => {
  it('빈 날을 눌렀을 때 가장 가까운 회차를 고른다', () => {
    // 지금 일정은 주 단위로 드문드문 놓여 빈 날이 훨씬 많다.
    const dates = ['2026-08-03', '2026-08-10', '2026-08-17'];

    expect(nearestDate(dates, '2026-08-05')).toBe('2026-08-03');
    expect(nearestDate(dates, '2026-08-08')).toBe('2026-08-10');
    // 범위 밖도 가장 가까운 쪽으로 붙인다.
    expect(nearestDate(dates, '2026-09-20')).toBe('2026-08-17');
    expect(nearestDate(dates, '2026-07-01')).toBe('2026-08-03');
  });

  it('달을 넘어가도 거리를 제대로 잰다', () => {
    // 문자열 비교로 재면 "08-31과 09-01"이 멀다고 나온다.
    expect(nearestDate(['2026-08-31', '2026-10-01'], '2026-09-02')).toBe('2026-08-31');
  });

  it('회차가 없으면 없다고 한다', () => {
    expect(nearestDate([], '2026-08-05')).toBeUndefined();
  });
});

describe('라벨', () => {
  it('앞의 0을 떼고 읽는다', () => {
    expect(dayLabel('2026-08-03')).toBe('8월 3일');
    expect(monthLabel('2026-08')).toBe('2026년 8월');
  });
});
