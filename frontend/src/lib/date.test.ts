import { checkTime, formatTimeInput, toApiTime, toTimeDigits } from '@/lib/date';

/**
 * 알림 시각 입력. 숫자만 들고 있다가 `HH:mm`으로 보낸다. (V12 · `PATCH /routines/{id}/notification`)
 *
 * 서버가 `"HH:mm"`으로 계약했으므로 `toApiTime`이 초를 붙이면 안 된다.
 */

describe('formatTimeInput', () => {
  it('치는 중에도 자연스럽게 보인다', () => {
    expect(formatTimeInput('')).toBe('');
    expect(formatTimeInput('0')).toBe('0');
    expect(formatTimeInput('07')).toBe('07');
    expect(formatTimeInput('073')).toBe('07:3');
    expect(formatTimeInput('0730')).toBe('07:30');
  });
});

describe('checkTime', () => {
  // 다 치기 전에 빨간 글씨를 띄우지 않는다.
  it('4자리를 채우기 전에는 아무 말도 하지 않는다', () => {
    expect(checkTime('07')).toEqual({ ok: false });
    expect(checkTime('073')).toEqual({ ok: false });
  });

  it('없는 시각을 막는다', () => {
    expect(checkTime('2400').message).toBeDefined();
    expect(checkTime('0760').message).toBeDefined();
  });

  it('경계값을 통과시킨다', () => {
    expect(checkTime('0000').ok).toBe(true);
    expect(checkTime('2359').ok).toBe(true);
  });
});

describe('toApiTime', () => {
  it('초 없이 HH:mm으로 만든다', () => {
    expect(toApiTime('0730')).toBe('07:30');
    expect(toApiTime('0000')).toBe('00:00');
  });
});

describe('toTimeDigits', () => {
  it('서버 값을 입력 칸으로 되돌린다', () => {
    expect(toTimeDigits('07:30')).toBe('0730');
    // 정하지 않은 목표는 null이다. 빈 칸에서 시작한다.
    expect(toTimeDigits(null)).toBe('');
    expect(toTimeDigits(undefined)).toBe('');
  });

  it('초가 붙어 와도 시:분만 남긴다', () => {
    expect(toTimeDigits('07:30:00')).toBe('0730');
  });
});
