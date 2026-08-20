import { ApiError } from '@/services/apiError';

/**
 * 서버 오류를 **사용자가 읽을 문장**으로 옮긴다.
 *
 * 🔴 **`details`를 버리지 않는다.** 서버는 무엇이 왜 틀렸는지를 `details`에 필드별로
 * 담아 보내는데(`GlobalExceptionHandler.handleValidation`), 예전에는 `message`만 읽어
 * **"입력값을 다시 확인해주세요."** 한 줄로 뭉갰다 — 비밀번호가 짧은 건지 이메일
 * 형식이 틀린 건지 사용자가 알 방법이 없었다.
 */

/**
 * `details`에서 사용자에게 보일 문구만 필드별로 고른다.
 *
 * 🔴 **한글이 든 값만 고른다.** `ANALYSIS_INVALID_STATE`처럼 `analysisId`(UUID)와
 * `status`(enum)를 사람이 읽을 문구와 **함께** 싣는 자리가 있다. 거르지 않으면
 * 화면에 UUID가 그대로 뜬다.
 */
export function detailFields(details: unknown): Record<string, string> {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return {};
  const picked: Record<string, string> = {};
  for (const [field, value] of Object.entries(details as Record<string, unknown>)) {
    if (typeof value === 'string' && /[가-힣]/.test(value)) picked[field] = value;
  }
  return picked;
}

/** 필드별 사유가 있으면 그것이 정본이다. 일반 문구보다 훨씬 구체적이다. */
export function messageOf(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  return Object.values(detailFields(error.details)).join('\n') || error.message || fallback;
}
