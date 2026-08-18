/**
 * 가입 나이·동의 규칙. 백엔드 `ConsentPolicy`와 **같은 값이어야 한다.**
 *
 * 최종 판정은 서버가 한다 — 여기서 막는 것은 사용자 편의일 뿐이고, 요청을 직접
 * 만들면 우회된다. 그래도 화면에서 먼저 막아야 다 채우고 나서야 거절당하는 일이
 * 없다. (`WEEKS_PER_MONTH`를 양쪽에 둔 것과 같은 이유)
 */

export const CONSENT_CODES = ['TERMS', 'PRIVACY', 'BIOMETRIC', 'MARKETING'] as const;
export type ConsentCode = (typeof CONSENT_CODES)[number];

/** 이 셋이 빠지면 가입되지 않는다. 마케팅은 선택이다. */
export const REQUIRED_CONSENTS: ConsentCode[] = ['TERMS', 'PRIVACY', 'BIOMETRIC'];

export const CONSENT_LABEL: Record<ConsentCode, string> = {
  TERMS: '서비스 이용약관',
  PRIVACY: '개인정보 수집·이용',
  BIOMETRIC: '얼굴 사진·건강 정보(민감정보) 수집·이용',
  MARKETING: '마케팅 정보 수신',
};

export const CONSENT_DETAIL: Record<ConsentCode, string> = {
  TERMS: 'GO. 서비스 이용에 관한 기본 약관이에요.',
  PRIVACY: '이메일과 닉네임, 생년월일을 계정 관리 목적으로 써요.',
  BIOMETRIC: '얼굴 사진과 인바디·신장·체중·수면 정보를 분석 목적으로만 써요. 다른 사용자에게 공개되지 않아요.',
  MARKETING: '새 기능과 이벤트 소식을 받아요. 동의하지 않아도 가입할 수 있어요.',
};

/**
 * 단독 가입 가능한 최소 나이(만).
 *
 * 법이 제한하는 것은 만 14세 **미만**이다. 만 14세는 가입할 수 있으므로
 * `age < MIN_AGE`로 비교한다. `<=`로 쓰면 법이 허용하는 14세까지 막힌다.
 */
export const MIN_AGE = 14;

/** `YYYYMMDD` 8자리를 날짜로 읽는다. 형식이나 실재하지 않는 날짜면 undefined. */
export function parseBirthDate(digits: string): Date | undefined {
  if (!/^\d{8}$/.test(digits)) return undefined;
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  const date = new Date(year, month - 1, day);
  // 2월 30일 같은 값은 Date가 조용히 넘겨 버린다. 되읽어서 대조한다.
  const real = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return real ? date : undefined;
}

/** 기준일 시점의 만 나이. 생일이 지나지 않았으면 한 살 뺀다. */
export function ageOn(birth: Date, today: Date): number {
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

/** 서버가 받는 `YYYY-MM-DD`. */
export function toIsoBirthDate(digits: string): string {
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

/** 입력 중인 숫자를 `YYYY.MM.DD`로 보여준다. */
export function formatBirthInput(digits: string): string {
  const parts = [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean);
  return parts.join('.');
}

export type BirthCheck = { ok: boolean; message?: string };

/** 화면에 띄울 생년월일 판정. 입력 중(8자리 미만)에는 아무 말도 하지 않는다. */
export function checkBirth(digits: string, today = new Date()): BirthCheck {
  if (digits.length < 8) return { ok: false };
  const date = parseBirthDate(digits);
  if (!date) return { ok: false, message: '없는 날짜예요. 생년월일을 확인해주세요.' };
  if (date > today) return { ok: false, message: '미래 날짜는 입력할 수 없어요.' };
  if (ageOn(date, today) < MIN_AGE) return { ok: false, message: `만 ${MIN_AGE}세 미만은 가입할 수 없어요.` };
  return { ok: true };
}
