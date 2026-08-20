import { emailFromIdToken } from '@/lib/idToken';

/**
 * 가입 화면에 "어느 Google 계정으로 가입하는지" 보여주려고 쓰는 것.
 *
 * 🔴 <b>서명을 확인하지 않는다.</b> 진짜 검증은 서버가 한다. 그래서 이 함수는
 * <b>절대 던지면 안 된다</b> — 이메일을 못 보여주는 것은 흠이지만, 그것 때문에
 * 가입 화면이 죽으면 안 된다.
 */

/** 서명 자리는 아무 값이나 넣는다 — 이 함수는 payload 만 본다. */
const token = (claims: object) => {
  const b64 = Buffer.from(JSON.stringify(claims)).toString('base64');
  const b64url = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `header.${b64url}.signature`;
};

describe('emailFromIdToken', () => {
  it('payload 에서 이메일을 꺼낸다', () => {
    expect(emailFromIdToken(token({ email: 'go@example.com', sub: '123' }))).toBe('go@example.com');
  });

  /** base64url 은 `-`·`_` 를 쓴다. 표준 base64 로 바꾸지 않으면 깨진다. */
  it('base64url 로 인코딩된 것도 읽는다', () => {
    const value = emailFromIdToken(token({ email: 'go+tag@example.com', name: '오해서', sub: '??~?' }));
    expect(value).toBe('go+tag@example.com');
  });

  it('이메일이 없으면 undefined 다', () => {
    expect(emailFromIdToken(token({ sub: '123' }))).toBeUndefined();
  });

  /** 🔴 어떤 쓰레기가 들어와도 던지지 않는다. */
  it('망가진 토큰에도 던지지 않는다', () => {
    expect(emailFromIdToken('')).toBeUndefined();
    expect(emailFromIdToken('not-a-jwt')).toBeUndefined();
    expect(emailFromIdToken('a.!!!not-base64!!!.c')).toBeUndefined();
    expect(emailFromIdToken('a..c')).toBeUndefined();
  });
});
