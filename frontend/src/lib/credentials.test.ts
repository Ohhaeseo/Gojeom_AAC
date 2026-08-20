import { authErrorFields, checkEmail, checkPassword, checkPasswordPresent } from '@/lib/credentials';

/**
 * 가입·로그인에서 <b>안 되는 이유를 정확히 말하기 위한</b> 검사들.
 *
 * 서버 `AuthDtos`의 제약과 같은 값이어야 한다 — 여기가 느슨하면 서버가 잡아 주지만,
 * 여기가 <b>서버보다 엄격하면</b> 서버가 받아 줄 계정을 가진 사람이 가입을 못 한다.
 */

describe('checkEmail', () => {
  it('비어 있으면 그렇게 말한다', () => {
    expect(checkEmail('')).toEqual({ ok: false, message: '이메일을 입력해주세요.' });
    expect(checkEmail('   ')).toEqual({ ok: false, message: '이메일을 입력해주세요.' });
  });

  it('흔한 오타를 잡는다', () => {
    expect(checkEmail('go').ok).toBe(false);
    expect(checkEmail('go@').ok).toBe(false);
    expect(checkEmail('go@example').ok).toBe(false);
    expect(checkEmail('go example@mail.com').ok).toBe(false);
  });

  it('정상 주소는 통과시킨다', () => {
    expect(checkEmail('go@example.com').ok).toBe(true);
    expect(checkEmail('go.jeom+tag@sub.example.co.kr').ok).toBe(true);
    expect(checkEmail('  go@example.com  ').ok).toBe(true);
  });
});

describe('checkPassword', () => {
  it('서버와 같은 8자 기준을 쓴다', () => {
    expect(checkPassword('1234567')).toEqual({ ok: false, message: '비밀번호는 8자 이상이어야 해요.' });
    expect(checkPassword('12345678').ok).toBe(true);
  });

  it('비어 있으면 길이가 아니라 비었다고 말한다', () => {
    expect(checkPassword('')).toEqual({ ok: false, message: '비밀번호를 입력해주세요.' });
  });

  /** 로그인은 길이를 따지지 않는다 — 틀린 비밀번호의 길이를 알려줄 이유가 없다. */
  it('로그인용은 비었는지만 본다', () => {
    expect(checkPasswordPresent('123').ok).toBe(true);
    expect(checkPasswordPresent('')).toEqual({ ok: false, message: '비밀번호를 입력해주세요.' });
  });
});

describe('authErrorFields', () => {
  it('서버가 지목한 필드가 있으면 그대로 쓴다', () => {
    expect(authErrorFields({ fields: { email: '이메일 형식을 확인해주세요.' } }))
      .toEqual({ email: '이메일 형식을 확인해주세요.' });
  });

  /** 🔴 "이미 가입된 이메일이에요."는 이메일 칸 밑에 있어야 어디를 고칠지 보인다. */
  it('details가 없는 코드도 맞는 칸에 붙인다', () => {
    expect(authErrorFields({ code: 'AUTH_EMAIL_DUPLICATED', message: '이미 가입된 이메일이에요.' }))
      .toEqual({ email: '이미 가입된 이메일이에요.' });
    expect(authErrorFields({ code: 'AUTH_INVALID_CREDENTIALS', message: '이메일 또는 비밀번호를 확인해주세요.' }))
      .toEqual({ password: '이메일 또는 비밀번호를 확인해주세요.' });
  });

  it('붙일 칸이 없으면 빈 객체다 — 화면이 위쪽 한 줄로 보여준다', () => {
    expect(authErrorFields({ code: 'NETWORK_ERROR', message: '서버에 연결하지 못했어요.' })).toEqual({});
    expect(authErrorFields({})).toEqual({});
  });
});
