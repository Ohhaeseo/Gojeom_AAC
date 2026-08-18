import { frequencyRank, groupByTiming, timingRank, todayTasks, weeklyProgress } from '@/lib/tasks';
import type { RoutineTask } from '@/types/api';

/**
 * 정렬·회차 선택 규칙. **전부 실제로 걸렸거나 걸릴 뻔한 지점이다.**
 *
 * <ul>
 *   <li>빈도 → 시점 순서 (피드백 5번 "반복하는 것을 위로")</li>
 *   <li>여러 목표를 합쳤을 때 <b>시작일이 다른 목표가 사라지지 않는지</b> (피드백 7번)</li>
 * </ul>
 *
 * 두 번째가 요점이다. 회차를 전체에서 하나 고르면 그 날짜에 회차가 없는 목표는
 * 통째로 빠지는데, 화면에는 "그냥 태스크가 적다"로 보여 알아채기 어렵다.
 */

const iso = (offsetDays: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const task = (title: string, timing: string, scheduledDate: string, routineId?: string): RoutineTask => ({
  taskId: title,
  routineId,
  category: 'SKIN',
  title,
  timing,
  durationLabel: '',
  amountLabel: '',
  scheduledDate,
  status: 'PENDING',
});

const titles = (items: RoutineTask[]) => items.map((item) => item.title);

describe('frequencyRank', () => {
  // 프롬프트는 빈도가 섞일 때만 `"주 3회 저녁"`처럼 적는다. 표기가 없으면 매일이다.
  it('빈도 표기가 없으면 매일로 본다', () => {
    expect(frequencyRank('아침')).toBe(0);
    expect(frequencyRank('매일 외출 전')).toBe(0);
    expect(frequencyRank('자기 전')).toBe(0);
  });

  it('주 N회는 매일보다 뒤로 가고, N이 클수록 앞이다', () => {
    expect(frequencyRank('주 5회 저녁')).toBeGreaterThan(frequencyRank('아침'));
    expect(frequencyRank('주 5회 저녁')).toBeLessThan(frequencyRank('주 3회 저녁'));
  });

  it('띄어쓰기가 없어도 읽는다', () => {
    expect(frequencyRank('주3회 저녁')).toBe(frequencyRank('주 3회 저녁'));
  });
});

describe('timingRank', () => {
  it('하루 순서대로 매긴다', () => {
    expect(timingRank('기상 직후')).toBeLessThan(timingRank('점심 후'));
    expect(timingRank('점심 후')).toBeLessThan(timingRank('저녁'));
    expect(timingRank('저녁')).toBeLessThan(timingRank('자기 전'));
  });

  // 모르는 것을 맨 앞이나 맨 뒤로 몰면 순서가 더 이상해진다.
  it('아무 데도 걸리지 않으면 중간에 둔다', () => {
    const unknown = timingRank('틈틈이');
    expect(unknown).toBeGreaterThan(timingRank('아침'));
    expect(unknown).toBeLessThan(timingRank('자기 전'));
  });
});

describe('todayTasks — 정렬', () => {
  it('매일 하는 것이 위로 오고, 그 안에서 시간순이다', () => {
    const today = iso(0);
    const items = todayTasks([
      task('주3회 아침운동', '주 3회 아침', today, 'r1'),
      task('자기 전 스트레칭', '자기 전', today, 'r1'),
      task('기상 직후 물', '기상 직후', today, 'r1'),
      task('주5회 저녁근력', '주 5회 저녁', today, 'r1'),
      task('점심 후 걷기', '점심 후', today, 'r1'),
    ]).items;

    expect(titles(items)).toEqual([
      '기상 직후 물', '점심 후 걷기', '자기 전 스트레칭',
      '주5회 저녁근력', '주3회 아침운동',
    ]);
  });
});

describe('todayTasks — 회차 선택', () => {
  it('오늘 이전 중 가장 최근 회차를 고른다', () => {
    const result = todayTasks([
      task('지난주', '아침', iso(-7), 'r1'),
      task('이번주', '아침', iso(-1), 'r1'),
      task('다음주', '아침', iso(7), 'r1'),
    ]);

    expect(titles(result.items)).toEqual(['이번주']);
    expect(result.date).toBe(iso(-1));
  });

  it('아직 시작 전이면 첫 회차를 보여준다', () => {
    const result = todayTasks([
      task('둘째주', '아침', iso(14), 'r1'),
      task('첫주', '아침', iso(7), 'r1'),
    ]);

    expect(titles(result.items)).toEqual(['첫주']);
  });

  /**
   * <b>이것이 다중 선택의 핵심 회귀 테스트다.</b>
   *
   * 전체에서 날짜 하나를 고르면 오늘 회차가 없는 목표 A가 통째로 사라진다.
   * 목표마다 따로 골라야 둘 다 남는다.
   */
  it('시작일이 다른 목표를 합쳐도 양쪽이 모두 남는다', () => {
    const items = todayTasks([
      task('A-아침', '아침', iso(-7), 'rA'),
      task('A-저녁', '저녁', iso(-7), 'rA'),
      task('B-아침', '아침', iso(0), 'rB'),
      task('B-자기전', '자기 전', iso(0), 'rB'),
    ]).items;

    expect(new Set(items.map((item) => item.routineId))).toEqual(new Set(['rA', 'rB']));
    // 목표별로 뭉치지 않고 시점끼리 섞인다.
    expect(titles(items)).toEqual(['A-아침', 'B-아침', 'A-저녁', 'B-자기전']);
  });

  it('목표를 여럿 합치면 date는 비운다 — 하나로 말할 수 없다', () => {
    const result = todayTasks([
      task('A', '아침', iso(-7), 'rA'),
      task('B', '아침', iso(0), 'rB'),
    ]);

    expect(result.date).toBeUndefined();
  });

  // `routineId`는 화면이 붙여 주는 값이라 단일 목표 조회에는 없다.
  it('routineId가 없어도 예전처럼 동작한다', () => {
    const result = todayTasks([
      task('저녁 보습', '저녁', iso(0)),
      task('아침 세안', '아침', iso(0)),
    ]);

    expect(titles(result.items)).toEqual(['아침 세안', '저녁 보습']);
    expect(result.date).toBe(iso(0));
  });

  it('빈 배열을 넣으면 빈 결과다', () => {
    expect(todayTasks([])).toEqual({ items: [] });
  });
});

describe('groupByTiming', () => {
  const today = iso(0);

  it('시점 구분이 없는 것이 맨 위, 그 아래로 하루 순서다', () => {
    const groups = groupByTiming(todayTasks([
      task('자기 전 스트레칭', '자기 전', today),
      task('물 자주 마시기', '수시로', today),
      task('아침 세안', '아침', today),
      task('저녁 보습', '저녁', today),
      task('점심 후 걷기', '점심 후', today),
    ]).items);

    expect(groups.map((group) => group.label)).toEqual(['수시로', '아침', '점심', '저녁', '자기 전']);
    expect(groups[0]?.items.map((item) => item.title)).toEqual(['물 자주 마시기']);
  });

  // 제목만 있고 아래가 빈 칸은 없느니만 못하다.
  it('비어 있는 묶음은 내보내지 않는다', () => {
    const groups = groupByTiming(todayTasks([task('아침 세안', '아침', today)]).items);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBe('아침');
  });

  it('묶음 안에서는 자주 반복하는 것이 위다', () => {
    const groups = groupByTiming(todayTasks([
      task('주3회 저녁운동', '주 3회 저녁', today),
      task('매일 저녁 보습', '저녁', today),
    ]).items);

    expect(groups[0]?.items.map((item) => item.title)).toEqual(['매일 저녁 보습', '주3회 저녁운동']);
  });

  it('하나도 없으면 빈 배열이다', () => {
    expect(groupByTiming([])).toEqual([]);
  });
});

describe('weeklyProgress', () => {
  const weekly = (title: string, weekStart: string, status: 'PENDING' | 'DONE'): RoutineTask => ({
    taskId: title + weekStart + status + Math.random(),
    routineId: 'r1', category: 'BODY', title, timing: '주 3회 저녁',
    durationLabel: '', amountLabel: '30초 3세트',
    scheduledDate: weekStart, weekStart, weeklyTarget: 3, status,
  });

  it('매일 하는 일은 셀 것이 없다', () => {
    const daily: RoutineTask = {
      taskId: 'd1', routineId: 'r1', category: 'BODY', title: '스쿼트 하기', timing: '매일 아침',
      durationLabel: '', amountLabel: '15회', scheduledDate: '2026-08-19',
      weekStart: '2026-08-19', weeklyTarget: null, status: 'PENDING',
    };
    expect(weeklyProgress(daily, [daily])).toBeUndefined();
  });

  it('같은 주의 같은 태스크만 센다', () => {
    const all = [
      weekly('플랭크 버티기', '2026-08-19', 'DONE'),
      weekly('플랭크 버티기', '2026-08-19', 'DONE'),
      weekly('플랭크 버티기', '2026-08-19', 'PENDING'),
      // 다음 주 것은 이번 주에 세지 않는다
      weekly('플랭크 버티기', '2026-08-26', 'DONE'),
    ];
    expect(weeklyProgress(all[0]!, all)).toEqual({ done: 2, target: 3 });
  });

  it('목표 횟수를 넘겨 체크해도 상한을 넘지 않는다', () => {
    // 넷째 날을 더 체크했다고 4/3이 되면 안 된다.
    const all = Array.from({ length: 5 }, () => weekly('플랭크 버티기', '2026-08-19', 'DONE'));
    expect(weeklyProgress(all[0]!, all)).toEqual({ done: 3, target: 3 });
  });
});
