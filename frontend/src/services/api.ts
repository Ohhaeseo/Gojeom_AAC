import type { ApiResponse } from '@/types/api';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

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

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError('EXPO_PUBLIC_API_BASE_URL이 설정되지 않았습니다.');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  });

  const payload = await response.json() as ApiResponse<T>;
  if (!response.ok || !payload.success) {
    const error = payload.success ? undefined : payload.error;
    throw new ApiError(error?.message ?? '요청을 처리하지 못했습니다.', response.status, error?.code ?? 'HTTP_ERROR', error?.details);
  }
  return payload.data;
}

export const isMockMode = !API_BASE_URL;
