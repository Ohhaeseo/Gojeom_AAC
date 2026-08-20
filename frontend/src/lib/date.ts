/**
 * 화면에 찍는 날짜 포맷.
 *
 * 분석일(`analyzedAt`)은 서버가 ISO-8601 UTC로 내려준다. 화면은 **사용자 기기의
 * 로컬 시각**으로 보여줘야 한다 — UTC를 그대로 자르면 한국에서 오전 9시 이전에
 * 분석한 결과가 하루 전날로 찍힌다.
 */
const pad = (value: number) => String(value).padStart(2, '0');

/** `2026.08.17` */
export function formatDate(date: Date): string {
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

export function formatAnalyzedDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : formatDate(date);
}

/** 서버가 기대하는 `YYYY-MM-DD`. 로컬 날짜 기준이라 `toISOString()`을 쓰지 않는다. */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * 목표 종료일. 서버 계산식과 같아야 한다 — `end = start + weeks * 7 - 1`.
 * (ERD.md §3.9 · `Routine.standalone`)
 */
export function endDateOf(start: Date, weeks: number): Date {
  const end = new Date(start);
  end.setDate(end.getDate() + weeks * 7 - 1);
  return end;
}

// ---------------------------------------------------------------- 알림 시각

/**
 * 알림 시각 입력. 숫자만 들고 있다가 화면에 `07:30`으로 보여준다.
 *
 * 생년월일과 같은 방식이다(`lib/consent.formatBirthInput`). 자리마다 칸을 나누면
 * 지우고 고칠 때 커서가 튄다.
 */
export function formatTimeInput(digits: string): string {
  const parts = [digits.slice(0, 2), digits.slice(2, 4)].filter(Boolean);
  return parts.join(':');
}

export type TimeCheck = { ok: boolean; message?: string };

/** 입력 중(4자리 미만)에는 아무 말도 하지 않는다. 다 치기 전에 빨간 글씨를 띄우지 않는다. */
export function checkTime(digits: string): TimeCheck {
  if (digits.length < 4) return { ok: false };
  const hour = Number(digits.slice(0, 2));
  const minute = Number(digits.slice(2, 4));
  if (hour > 23) return { ok: false, message: '시는 00~23 사이여야 해요.' };
  if (minute > 59) return { ok: false, message: '분은 00~59 사이여야 해요.' };
  return { ok: true };
}

/** 서버가 기대하는 `HH:mm`. `checkTime`이 통과한 값에만 쓴다. */
export function toApiTime(digits: string): string {
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
}

/** `"07:30"` → `"0730"`. 서버 값을 입력 칸에 되돌릴 때 쓴다. */
export function toTimeDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '').slice(0, 4);
}
