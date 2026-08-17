/**
 * 화면에 찍는 날짜 포맷.
 *
 * 분석일(`analyzedAt`)은 서버가 ISO-8601 UTC로 내려준다. 화면은 **사용자 기기의
 * 로컬 시각**으로 보여줘야 한다 — UTC를 그대로 자르면 한국에서 오전 9시 이전에
 * 분석한 결과가 하루 전날로 찍힌다.
 */
export function formatAnalyzedDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}
