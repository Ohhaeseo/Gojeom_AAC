import { checkBirth, toIsoBirthDate } from '@/lib/consent';

/**
 * 생년월일을 서버로 보내기 전에 거치는 곳.
 *
 * 🔴 <b>실제로 Google 로그인을 막고 있던 자리다.</b> 예전 `toIsoBirthDate`는 자르고
 * 붙이기만 해서 빈 문자열을 {@code "--"}로 만들었다. 생년월일을 비운 채 Google
 * 버튼을 누르면 그 값이 그대로 서버로 가 {@code LocalDate} 파싱에 실패했고,
 * <b>400 VALIDATION_ERROR</b>가 났다. 화면에는 아무 사유도 뜨지 않았다.
 */

describe('toIsoBirthDate', () => {
  it('8자리를 ISO 날짜로 바꾼다', () => {
    expect(toIsoBirthDate('20000131')).toBe('2000-01-31');
  });

  /** 🔴 이것이 요점이다. 예전에는 "--" 를 만들어 서버로 보냈다. */
  it('덜 채운 값으로는 아무것도 만들지 않는다', () => {
    expect(toIsoBirthDate('')).toBeUndefined();
    expect(toIsoBirthDate('2000')).toBeUndefined();
    expect(toIsoBirthDate('2000013')).toBeUndefined();
  });

  it('8자리를 넘겨도 만들지 않는다 — 잘라서 보내면 엉뚱한 날짜가 된다', () => {
    expect(toIsoBirthDate('200001311')).toBeUndefined();
  });
});

describe('checkBirth', () => {
  it('덜 채운 동안에는 잔소리하지 않는다', () => {
    expect(checkBirth('2000')).toEqual({ ok: false });
  });

  it('없는 날짜를 잡는다', () => {
    expect(checkBirth('20000231').ok).toBe(false);
    expect(checkBirth('20001301').ok).toBe(false);
  });

  it('미래 날짜를 잡는다', () => {
    const 내년 = new Date();
    내년.setFullYear(내년.getFullYear() + 1);
    const pad = (value: number) => String(value).padStart(2, '0');
    const digits = `${내년.getFullYear()}${pad(내년.getMonth() + 1)}${pad(내년.getDate())}`;
    expect(checkBirth(digits).ok).toBe(false);
  });

  it('만 14세 미만을 막는다', () => {
    const today = new Date('2026-08-20T00:00:00');
    expect(checkBirth('20120820', today).ok).toBe(true);   // 그날 만 14세가 된다
    expect(checkBirth('20120821', today).ok).toBe(false);  // 하루 모자란다
  });
});
