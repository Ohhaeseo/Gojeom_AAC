import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Provider } from '@/types/api';

/**
 * 로그인 세션. 백엔드가 준 JWT를 기기에 보관한다.
 *
 * 메모리 캐시를 함께 두는 이유 — 모든 요청이 헤더를 붙이려고 AsyncStorage를
 * 읽으면 요청마다 비동기 I/O가 한 번씩 더 붙는다. 앱 시작 시 한 번 읽고
 * 이후에는 메모리 값을 쓴다.
 */
export type Session = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  nickname: string;
  provider: Provider;
};

const STORAGE_KEY = '@go/session-v1';

let cached: Session | null = null;

export function currentSession(): Session | null {
  return cached;
}

export async function restoreSession(): Promise<Session | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    cached = stored ? (JSON.parse(stored) as Session) : null;
  } catch {
    cached = null;
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
  }
  return cached;
}

export async function saveSession(session: Session): Promise<Session> {
  cached = session;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

/** 토큰 갱신은 access/refresh만 바뀐다. 사용자 정보는 그대로 둔다. */
export async function updateTokens(accessToken: string, refreshToken: string): Promise<void> {
  if (!cached) return;
  await saveSession({ ...cached, accessToken, refreshToken });
}

export async function patchSession(patch: Partial<Session>): Promise<void> {
  if (!cached) return;
  await saveSession({ ...cached, ...patch });
}

export async function clearSession(): Promise<void> {
  cached = null;
  await AsyncStorage.removeItem(STORAGE_KEY);
}
