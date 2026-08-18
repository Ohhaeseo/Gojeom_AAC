import type { ApiResponse } from '@/types/api';
import { clearSession, currentSession, updateTokens } from '@/services/session';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

/** 백엔드 주소가 없으면 mock으로 동작한다. 데모는 서버 없이도 돌아가야 한다. */
export const isMockMode = !API_BASE_URL;

/** 요청이 영영 매달려 있지 않게 한다. AI 단계는 서버에서 최대 60초까지 걸린다. */
const TIMEOUT_MS = 70_000;

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

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** false면 Authorization 헤더를 붙이지 않는다 (로그인·회원가입). */
  auth?: boolean;
};

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, {
    method: (init?.method as RequestOptions['method']) ?? 'GET',
    body: init?.body,
  });
}

/**
 * 백엔드 호출 1건.
 *
 * `{ success, data, error }` 봉투를 여기서 풀어 `data`만 돌려준다. 화면과 서비스는
 * 봉투를 몰라도 된다. (API.md §1)
 *
 * 액세스 토큰이 만료되면 refresh로 한 번 갱신하고 원 요청을 재시도한다. 그것도
 * 실패하면 세션을 지운다. (API.md §2)
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options);

  if (response.status === 401 && options.auth !== false && (await tryRefresh())) {
    return unwrap<T>(await send(path, options));
  }
  return unwrap<T>(response);
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  if (!API_BASE_URL) {
    throw new ApiError('EXPO_PUBLIC_API_BASE_URL이 설정되지 않았습니다.');
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const token = currentSession()?.accessToken;
  if (token && options.auth !== false) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch (error) {
    // 네트워크 자체가 안 되는 경우. 서버 주소를 잘못 넣은 상황이 대부분이다.
    const aborted = error instanceof Error && error.name === 'AbortError';
    throw new ApiError(
      aborted ? '서버 응답이 너무 늦어요. 잠시 후 다시 시도해주세요.' : '서버에 연결하지 못했어요. 주소와 네트워크를 확인해주세요.',
      undefined,
      aborted ? 'TIMEOUT' : 'NETWORK_ERROR',
    );
  } finally {
    clearTimeout(timer);
  }
}

async function unwrap<T>(response: Response): Promise<T> {
  // 204 No Content — 삭제 계열은 본문이 없다.
  if (response.status === 204) return undefined as T;

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || !payload.success) {
    const error = payload && !payload.success ? payload.error : undefined;
    throw new ApiError(
      error?.message ?? '요청을 처리하지 못했어요.',
      response.status,
      error?.code ?? 'HTTP_ERROR',
      error?.details,
    );
  }
  return payload.data;
}

/** @returns 갱신에 성공했으면 true */
async function tryRefresh(): Promise<boolean> {
  const session = currentSession();
  if (!session?.refreshToken) return false;

  try {
    const response = await send('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: session.refreshToken },
      auth: false,
    });
    const tokens = await unwrap<{ accessToken: string; refreshToken: string }>(response);
    await updateTokens(tokens.accessToken, tokens.refreshToken);
    return true;
  } catch {
    // refresh도 만료됐다. 세션을 지우고 **화면에 알린다.**
    await clearSession();
    expiredHandlers.forEach((handler) => handler());
    return false;
  }
}

/**
 * 세션이 끊겼을 때 부를 것들.
 *
 * <b>여기서 직접 화면을 옮기지 않는다.</b> 이 파일은 통신만 하는 층이라 라우터를
 * 알면 테스트도 어려워지고 의존이 거꾸로 선다. 대신 알려주기만 하고, 무엇을 할지는
 * 화면 쪽(`AppState`)이 정한다.
 *
 * <b>예전에는 세션만 지우고 아무에게도 알리지 않았다.</b> 그래서 만료된 사용자가
 * 잠금 화면이 뜬 홈을 보며 "내 데이터가 사라졌다"고 읽었다.
 */
type ExpiredHandler = () => void;
const expiredHandlers = new Set<ExpiredHandler>();

export function onSessionExpired(handler: ExpiredHandler): () => void {
  expiredHandlers.add(handler);
  return () => expiredHandlers.delete(handler);
}
