/**
 * 서버가 돌려준 실패 한 건.
 *
 * 🔴 **`services/api`가 아니라 여기 있다.** `api.ts`는 세션을 다루느라
 * `AsyncStorage`(네이티브 모듈)를 끌고 온다. 오류 문구를 만드는 순수 함수
 * (`lib/errors.ts`)가 그것까지 함께 불러오면 **테스트가 네이티브 없이는 돌지 않는다.**
 * 실제로 그렇게 물렸다 — 잎으로 떼어 두면 양쪽이 가볍게 쓴다.
 *
 * `services/api`가 그대로 다시 내보내므로 기존 import 경로는 바뀌지 않는다.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code = 'UNKNOWN_ERROR',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
