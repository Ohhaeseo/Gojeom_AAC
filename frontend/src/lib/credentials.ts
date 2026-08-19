/**
 * 이메일·비밀번호 형식 검사.
 *
 * 🔴 **서버 `AuthDtos`의 제약과 같은 값이어야 한다.** 여기서 막는 것은 사용자
 * 편의일 뿐이고 진짜 판정은 서버가 한다 — 요청을 직접 만들면 우회된다.
 * (`checkBirth`가 나이를 다루는 방식과 같다)
 *
 * **문구도 서버와 같은 말로 맞춘다.** 같은 잘못에 화면마다 다른 말이 나오면
 * 사용자는 다른 문제라고 읽는다.
 *
 * **서버보다 엄격하게 굴지 않는다.** 여기서 잘못 막으면 서버가 받아 줄 주소를
 * 가진 사람이 가입 자체를 못 한다. 반대로 느슨한 것은 안전하다 — 서버가 걸러 주고,
 * 그 사유가 그대로 화면에 뜬다.
 */

export type FieldCheck = { ok: boolean; message?: string };

/** 서버 `@Size(max = 255)`. */
const EMAIL_MAX = 255;
/** 서버 `@Size(min = 8, max = 64)`. */
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 64;

/**
 * 흔한 오타를 잡는 정도로만 본다 — `@`가 하나, 앞뒤가 비지 않고, 공백이 없고,
 * 도메인에 점이 있다.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function checkEmail(raw: string): FieldCheck {
  const email = raw.trim();
  if (!email) return { ok: false, message: '이메일을 입력해주세요.' };
  if (email.length > EMAIL_MAX) return { ok: false, message: `이메일은 ${EMAIL_MAX}자 이내로 입력해주세요.` };
  if (!EMAIL.test(email)) return { ok: false, message: '이메일 형식을 확인해주세요. (예: go@example.com)' };
  return { ok: true };
}

/**
 * 로그인에서는 길이를 따지지 않는다. 규칙이 바뀌기 전에 가입한 사람이 자기
 * 비밀번호로 로그인하지 못하게 되고, 무엇보다 **틀린 비밀번호의 길이를 알려주는
 * 것은 로그인 화면이 할 일이 아니다.** 비어 있는지만 본다.
 */
export function checkPassword(raw: string): FieldCheck {
  if (!raw) return { ok: false, message: '비밀번호를 입력해주세요.' };
  if (raw.length < PASSWORD_MIN) return { ok: false, message: `비밀번호는 ${PASSWORD_MIN}자 이상이어야 해요.` };
  if (raw.length > PASSWORD_MAX) return { ok: false, message: `비밀번호는 ${PASSWORD_MAX}자 이내로 입력해주세요.` };
  return { ok: true };
}

/** 로그인용 — 비어 있는지만 본다. 위 주석 참고. */
export function checkPasswordPresent(raw: string): FieldCheck {
  return raw ? { ok: true } : { ok: false, message: '비밀번호를 입력해주세요.' };
}

/**
 * 서버가 필드를 지목하지 않는 사유 중, **어느 입력칸의 문제인지 분명한 것들.**
 *
 * `AUTH_EMAIL_DUPLICATED`에는 `details`가 없어 그냥 두면 화면 위쪽에 한 줄로 뜬다.
 * "이미 가입된 이메일이에요."는 **이메일 칸 밑에** 있어야 어디를 고칠지 바로 보인다.
 */
const FIELD_BY_CODE: Record<string, string> = {
  AUTH_EMAIL_DUPLICATED: 'email',
  AUTH_INVALID_CREDENTIALS: 'password',
  PROFILE_UNDERAGE: 'birthDate',
  CONSENT_REQUIRED: 'consent',
};

/** 실패 결과를 `{ 입력칸: 사유 }`로 옮긴다. 붙일 칸이 없으면 빈 객체다. */
export function authErrorFields(
  result: { code?: string; message?: string; fields?: Record<string, string> },
): Record<string, string> {
  if (result.fields) return result.fields;
  const field = result.code ? FIELD_BY_CODE[result.code] : undefined;
  return field && result.message ? { [field]: result.message } : {};
}
