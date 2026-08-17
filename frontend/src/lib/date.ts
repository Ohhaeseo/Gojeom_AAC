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
