import { toIsoDate } from '@/lib/date';

import type { ConsentCode } from '@/lib/consent';
import { ApiError, request } from '@/services/api';
import { clearSession, patchSession, saveSession, type Session } from '@/services/session';
import type {
  AnalysisResult,
  AnalysisStatus,
  Category,
  ImageStatus,
  Inbody,
  KeywordCategory,
  Profile,
  Provider,
  RoutineSourceType,
  RoutineTask,
  SubscriptionPlan,
  SubscriptionState,
  TaskStatus,
} from '@/types/api';

/**
 * 백엔드 엔드포인트 어댑터. 저장소 루트 `API.md`가 정본이다.
 *
 * 화면은 이 파일의 함수만 부른다. 경로·봉투·토큰은 전부 여기 아래에 숨는다.
 */

// ---------------------------------------------------------------- 인증

type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: { id: string; email: string; nickname: string; provider: Provider };
};

const toSession = (token: TokenResponse): Session => ({
  accessToken: token.accessToken,
  refreshToken: token.refreshToken,
  userId: token.user.id,
  email: token.user.email,
  nickname: token.user.nickname,
  provider: token.user.provider,
});

/**
 * 이메일 회원가입.
 *
 * `birthDate`는 `YYYY-MM-DD`, `agreedConsents`는 동의한 항목만 담는다.
 * **나이·동의 판정은 서버가 한다** — 화면 검사는 편의일 뿐 우회될 수 있다.
 */
export async function signup(
  email: string, password: string, nickname: string,
  birthDate: string, agreedConsents: ConsentCode[],
): Promise<Session> {
  const token = await request<TokenResponse>('/auth/signup', {
    method: 'POST',
    body: { email, password, nickname, birthDate, agreedConsents },
    auth: false,
  });
  return saveSession(toSession(token));
}

export async function login(email: string, password: string): Promise<Session> {
  const token = await request<TokenResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
  return saveSession(toSession(token));
}

/**
 * Google 로그인. 응답이 `/auth/login`과 동일한 `TokenResponse`라 화면이 분기하지 않는다.
 * (API.md §6.1)
 *
 * `idToken`은 Google이 준 ID 토큰 원문이다. 검증은 서버가 한다 — 프론트가
 * 열어보고 판단하지 않는다.
 */
export async function googleLogin(
  idToken: string, birthDate?: string, agreedConsents?: ConsentCode[],
): Promise<Session> {
  // 기존 계정이면 서버가 뒤의 둘을 무시한다. **최초 로그인은 회원가입이라**
  // 나이·동의가 필요하고, 없으면 서버가 SIGNUP_CONSENT_REQUIRED로 돌려보낸다.
  const token = await request<TokenResponse>('/auth/oauth/google', {
    method: 'POST',
    body: { idToken, birthDate, agreedConsents },
    auth: false,
  });
  return saveSession(toSession(token));
}

export async function logout(): Promise<void> {
  // 서버가 무상태라 실패해도 로컬 세션만 지우면 로그아웃은 성립한다.
  await request<void>('/auth/logout', { method: 'POST' }).catch(() => undefined);
  await clearSession();
}

// ---------------------------------------------------------------- 사용자

export type Me = {
  id: string;
  email: string;
  nickname: string;
  provider: Provider;
  joinedAt: string;
  hasProfile: boolean;
  analysisCredits: number;
  subscription: { plan: string; status: string; expiresAt: string | null; canAnalyze: boolean; canCreateRoutine: boolean } | null;
};

export const getMe = () => request<Me>('/users/me');

export async function updateNickname(nickname: string): Promise<void> {
  const me = await request<Me>('/users/me', { method: 'PATCH', body: { nickname } });
  await patchSession({ nickname: me.nickname });
}

export async function deleteAccount(): Promise<void> {
  await request<void>('/users/me', { method: 'DELETE' });
  await clearSession();
}

// ---------------------------------------------------------------- 업로드

export type UploadPurpose = 'PROFILE_PHOTO' | 'REFERENCE_IMAGE' | 'INBODY_DOCUMENT';

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/heic', webp: 'image/webp',
};

const SUPPORTED_CONTENT_TYPES = new Set(Object.values(CONTENT_TYPES));

/** 확장자에서 Content-Type을 고른다. presign 요청과 실제 PUT의 값이 같아야 서명이 맞는다. */
function contentTypeOf(uri: string): string {
  const extension = (uri.split('?')[0] ?? uri).split('.').pop()?.toLowerCase() ?? '';
  return CONTENT_TYPES[extension] ?? 'image/jpeg';
}

/**
 * 이미지 1장을 스토리지에 올리고 objectKey를 돌려준다.
 *
 * **바이트가 백엔드를 통과하지 않는다.** presigned URL을 받아 클라이언트가
 * 스토리지로 직접 PUT한다. (ARCHITECTURE.md A-1)
 */
export async function uploadImage(purpose: UploadPurpose, uri: string): Promise<string> {
  /*
    🔴 **읽기 실패와 올리기 실패를 구분한다.** 예전에는 여기서 난 예외가 그대로
    올라가 화면이 "프로필을 저장하지 못했어요"로 뭉갰다. 고른 사진을 못 읽는 것과
    네트워크가 안 되는 것은 사용자가 할 일이 전혀 다르다 — 앞은 다시 고르는 것이고
    뒤는 잠시 뒤 다시 누르는 것이다.

    웹에서 `blob:` 주소는 **탭을 새로 고치면 죽는다.** 그때 여기로 온다.
  */
  let blob: Blob;
  try {
    blob = await (await fetch(uri)).blob();
  } catch {
    throw new ApiError('고른 사진을 읽지 못했어요. 사진을 다시 선택해주세요.', undefined, 'IMAGE_READ_FAILED');
  }
  if (!blob.size) {
    // 0바이트를 올리면 업로드는 성공하고 **나중에 얼굴 인식에서** 엉뚱하게 막힌다.
    throw new ApiError('사진 파일이 비어 있어요. 다른 사진을 선택해주세요.', undefined, 'IMAGE_EMPTY');
  }

  // **Blob 자신의 type이 정본이다.** 웹 picker가 주는 `blob:` URI에는 확장자가 없어
  // URI만 보면 무엇을 골랐든 image/jpeg로 단정하게 된다. 그러면 PNG·HEIC를 고른
  // 사용자가 S3 업로드까지 성공한 뒤 프로필 등록에서 거부당한다 — 서버가 실제
  // 바이트와 신고한 형식을 대조하기 때문이다. (ImageContentInspector)
  // 네이티브는 `file:///...jpg`라 확장자가 있어 이 문제가 드러나지 않았다.
  const contentType = SUPPORTED_CONTENT_TYPES.has(blob.type) ? blob.type : contentTypeOf(uri);

  const presigned = await request<{ uploadUrl: string; objectKey: string; expiresIn: number }>(
    '/uploads/presigned',
    { method: 'POST', body: { purpose, contentType, contentLength: blob.size } },
  );

  const uploaded = await fetch(presigned.uploadUrl, {
    method: 'PUT',
    // presign에 담긴 Content-Type과 반드시 같아야 한다. 다르면 서명이 어긋난다.
    headers: { 'Content-Type': contentType },
    body: blob,
  });
  if (!uploaded.ok) {
    // 403은 서명이 어긋났거나 만료된 것이다(`expiresIn`). 사용자가 사진 고르기를
    // 오래 붙잡고 있었을 때 실제로 난다 — 다시 시도하면 새 서명을 받아 풀린다.
    const message = uploaded.status === 403
      ? '사진 업로드 권한이 만료됐어요. 다시 시도해주세요.'
      : `사진을 올리지 못했어요. 잠시 후 다시 시도해주세요. (오류 ${uploaded.status})`;
    throw new ApiError(message, uploaded.status, 'UPLOAD_FAILED');
  }
  return presigned.objectKey;
}

// ---------------------------------------------------------------- 프로필

export type ProfileInput = {
  photoKey: string;
  priorities: Category[];
  heightCm: number;
  weightKg: number;
  sleepHours?: number | null;
  inbody?: Inbody | null;
};

type ProfileResponse = Profile & { createdAt?: string };

export const createProfile = (input: ProfileInput) =>
  request<ProfileResponse>('/profiles', { method: 'POST', body: input });

export const getProfile = () => request<ProfileResponse>('/profiles/me');

/**
 * 사진만 바꾼다.
 *
 * 🔴 `createProfile`(`POST /profiles`)은 우선순위·키·체중·수면을 **모두** 요구한다.
 * 사진 한 장을 바꾸려고 그것을 전부 다시 입력하게 만들지 않으려고 따로 있다.
 * 얼굴 인식 같은 검증은 등록과 똑같이 거친다.
 */
export const replaceProfilePhoto = (photoKey: string) =>
  request<Profile>('/profiles/me/photo', { method: 'PUT', body: { photoKey } });

export const updateProfileBody = (input: { weightKg?: number; sleepHours?: number | null; inbody?: Inbody | null }) =>
  request<ProfileResponse>('/profiles/me', { method: 'PATCH', body: input });

export const updatePriorities = (priorities: Category[]) =>
  request<ProfileResponse>('/profiles/me/priorities', { method: 'PATCH', body: { priorities } });

export type InbodyScan = {
  extracted: Inbody;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  unrecognized: string[];
};

/** 결과는 폼을 채우는 용도일 뿐 저장되지 않는다. 사용자가 확인 후 저장해야 한다. (PRD G-8) */
export const scanInbody = (documentKey: string) =>
  request<InbodyScan>('/profiles/inbody/scan', { method: 'POST', body: { documentKey } });

// ---------------------------------------------------------------- 고점 분석

export type AnalysisAccepted = { analysisId: string; status: AnalysisStatus; pollAfterMs: number };

export type AnalysisProgress = {
  analysisId: string;
  status: AnalysisStatus;
  imageStatus: ImageStatus;
  progress: number;
  message: string;
  failureCode: string | null;
  pollAfterMs: number | null;
};

export type AnalysisKeyword = {
  id: string;
  label: string;
  reason: string;
  category: KeywordCategory;
  displayOrder: number;
};

export const createAnalysis = (inputText: string, referenceImageKeys: string[]) =>
  request<AnalysisAccepted>('/analyses', { method: 'POST', body: { inputText, referenceImageKeys } });

export const getAnalysisProgress = (analysisId: string) =>
  request<AnalysisProgress>(`/analyses/${analysisId}`);

export const getKeywords = (analysisId: string) =>
  request<{ analysisId: string; minSelect: number; maxSelect: number; keywords: AnalysisKeyword[] }>(
    `/analyses/${analysisId}/keywords`,
  );

export const selectKeywords = (analysisId: string, keywordIds: string[]) =>
  request<AnalysisAccepted>(`/analyses/${analysisId}/keywords/selection`, {
    method: 'POST',
    body: { keywordIds },
  });

export const getResult = (analysisId: string) =>
  request<AnalysisResult>(`/analyses/${analysisId}/result`);

export const saveResultToDrawer = (analysisId: string) =>
  request<{ savedResultId: string; savedAt: string }>(`/analyses/${analysisId}/result/save`, { method: 'POST' });

export const deleteAllAnalyses = () => request<void>('/analyses', { method: 'DELETE' });

/**
 * 상태가 목표치에 닿을 때까지 폴링한다.
 *
 * 서버가 내려주는 `pollAfterMs`를 그대로 따르고, null이면 종료 상태라는 뜻이므로
 * 멈춘다. 간격을 프론트가 임의로 정하지 않는다. (API.md C-4)
 */
/**
 * 진행 중인 분석 버리기.
 *
 * 🔴 키워드를 고르다 화면을 벗어난 분석은 `KEYWORDS_READY`로 **영영 남는다**
 * (좀비 스위퍼가 이 상태를 일부러 건드리지 않는다). 그 뒤로는 새 분석이 모두
 * 409로 막히므로, 이것이 빠져나가는 유일한 길이다.
 */
export const cancelAnalysis = (analysisId: string) =>
  request<void>(`/analyses/${analysisId}`, { method: 'DELETE' });

export async function pollAnalysis(
  analysisId: string,
  until: (progress: AnalysisProgress) => boolean,
  onProgress?: (progress: AnalysisProgress) => void,
  timeoutMs = 90_000,
): Promise<AnalysisProgress> {
  const startedAt = Date.now();

  for (;;) {
    const progress = await getAnalysisProgress(analysisId);
    onProgress?.(progress);

    if (progress.status === 'FAILED') {
      throw new ApiError(progress.message, undefined, progress.failureCode ?? 'ANALYSIS_FAILED');
    }
    if (until(progress)) return progress;
    if (progress.pollAfterMs == null) return progress;
    if (Date.now() - startedAt > timeoutMs) {
      throw new ApiError('분석이 지연되고 있어요. 다시 시도해주세요.', undefined, 'ANALYSIS_TIMEOUT');
    }
    await new Promise((resolve) => setTimeout(resolve, progress.pollAfterMs ?? 2000));
  }
}

// ---------------------------------------------------------------- 서랍

export type DrawerItem = {
  savedResultId: string;
  resultId: string;
  thumbnailUrl: string | null;
  title: string;
  analyzedAt: string;
  progressRate: number | null;
};

export const getDrawer = () =>
  request<{ inProgress: DrawerItem[]; recent: DrawerItem[]; all: DrawerItem[] }>('/saved-results');

export const getSavedResult = (savedResultId: string) =>
  request<AnalysisResult>(`/saved-results/${savedResultId}`);

export const deleteSavedResult = (savedResultId: string) =>
  request<void>(`/saved-results/${savedResultId}`, { method: 'DELETE' });

// ---------------------------------------------------------------- 목표

export type RoutineSummary = {
  routineId: string;
  sourceType: RoutineSourceType;
  category: Category | null;
  title: string;
  durationWeeks: number | null;
  startDate: string;
  endDate: string | null;
  taskCount: number;
  /** 사용자가 적은 목표. 경로 A는 null이다. (V10) */
  goalText: string | null;
  /** 체형 목표에서만 값을 갖는다. (V10) */
  targetWeightKg: number | null;
  /** 식사 방향. **일반 가이드다.** 관련이 옅은 목표는 null이다. (V11) */
  dietGuide: string | null;
  /**
   * 이 목표의 알림 시각 `HH:mm`. **정하지 않았으면 null**이고, 그때는
   * `/notifications/settings`의 `defaultTime`을 따른다. (V12)
   */
  notifyTime: string | null;
};

export type RoutineDetail = {
  routineId: string;
  sourceType: RoutineSourceType;
  category: Category | null;
  durationWeeks: number | null;
  title: string;
  analyzedAt: string | null;
  overview: {
    keywords: { id: string; label: string }[];
    keepPoints: string[];
    emphasizePoints: string[];
    changeIntensity: string[];
  } | null;
  progress: { done: number; total: number; rate: number };
  tasks: RoutineTask[];
  notification: { enabled: boolean; time: string };
};

/**
 * 목표 시작일의 기본값. **로컬 날짜다.**
 *
 * 🔴 `toISOString()`을 쓰면 UTC 날짜가 나온다. 한국은 UTC+9라 **자정부터 오전 9시
 * 사이에는 어제 날짜**가 나오고, 서버가 `Asia/Seoul` 기준으로 "오늘 이후"를 검사하므로
 * (`RoutineService.requireFutureStartDate`) 그 시간대에 목표 생성이 400으로 막힌다.
 *
 * 새벽에만 터져서 낮에 아무리 눌러 봐도 재현되지 않는다. 실제로 01시에 걸렸다.
 */
const today = () => toIsoDate(new Date());

export const createRoutineFromAnalysis = (sourceAnalysisResultId: string, startDate = today()) =>
  request<{ routines: RoutineSummary[] }>('/routines', {
    method: 'POST',
    body: { sourceType: 'FROM_ANALYSIS', sourceAnalysisResultId, startDate },
  });

export type StandaloneItem = {
  category: Category;
  durationWeeks: number;
  /** 무엇을 바꾸고 싶은지. AI가 루틴을 고르는 근거가 된다. */
  goalText?: string;
  /** 체형에서만 쓴다. 다른 카테고리에 보내면 서버가 버린다. */
  targetWeightKg?: number;
};

export const createStandaloneRoutine = (items: StandaloneItem[], startDate = today()) =>
  request<{ routines: RoutineSummary[] }>('/routines', {
    method: 'POST',
    body: { sourceType: 'STANDALONE', items, startDate },
  });

/**
 * 목록 순서 변경. **전체 순서를 통째로 보낸다.**
 *
 * 상대 지시("3번을 위로")는 중간에 목표가 지워지면 어긋난다. 화면이 보고 있는
 * 순서를 그대로 보내는 편이 항상 맞는다.
 */
export const reorderRoutines = (routineIds: string[]) =>
  request<{ items: RoutineSummary[] }>('/routines/order', { method: 'PATCH', body: { routineIds } });

export const listRoutines = () => request<{ items: RoutineSummary[] }>('/routines');

export const getRoutine = (routineId: string) => request<RoutineDetail>(`/routines/${routineId}`);

/** 목표 이름 변경. 갱신된 요약이 돌아온다. */
export const renameRoutine = (routineId: string, title: string) =>
  request<RoutineSummary>(`/routines/${routineId}`, { method: 'PATCH', body: { title } });

/**
 * 목표별 알림 시각. `null`을 주면 기본 시각을 따르도록 되돌린다.
 *
 * 켜고 끄는 것은 여기가 아니라 `/notifications/settings`다.
 */
export const setRoutineNotifyTime = (routineId: string, notifyTime: string | null) =>
  request<RoutineSummary>(`/routines/${routineId}/notification`, { method: 'PATCH', body: { notifyTime } });

export const deleteRoutine = (routineId: string) => request<void>(`/routines/${routineId}`, { method: 'DELETE' });

export const updateTaskStatus = (taskId: string, status: TaskStatus) =>
  request<{ taskId: string; status: TaskStatus; progress: { done: number; total: number; rate: number } }>(
    `/routine-tasks/${taskId}`,
    { method: 'PATCH', body: { status } },
  );

// ---------------------------------------------------------------- 알림

export const getNotificationSettings = () =>
  request<{ enabled: boolean; defaultTime: string }>('/notifications/settings');

export const updateNotificationSettings = (patch: { enabled?: boolean; defaultTime?: string }) =>
  request<{ enabled: boolean; defaultTime: string }>('/notifications/settings', { method: 'PATCH', body: patch });

/** Expo 푸시 토큰 등록. 같은 토큰을 다시 보내면 서버가 지금 사용자에게 옮겨 붙인다. */
export const registerDeviceToken = (token: string, platform: 'WEB' | 'IOS' | 'ANDROID') =>
  request<void>('/notifications/device-tokens', { method: 'POST', body: { token, platform } });

/**
 * 이 분석 결과에 어울리는 상품. **AI가 고른다.** (피드백 11번)
 *
 * 서버는 id만 준다 — 사진·링크·설명은 `src/data/products.ts`가 갖고 있다.
 * 모르는 id가 오면 화면이 조용히 건너뛴다. `productIds`가 비어 있는 것도 정상 답이다.
 */
export const getProductRecommendation = (resultId: string) =>
  request<{ productIds: string[]; reason: string | null }>(`/results/${resultId}/product-recommendation`);

// ---------------------------------------------------------------- 구독

export const getSubscription = () => request<SubscriptionState>('/subscriptions/me');

/**
 * 유료 구독으로 전환한다. **결제가 붙어 있지 않아 누르면 바로 활성화된다.**
 *
 * 가짜 응답이 아니라 서버의 구독 행이 실제로 바뀐다 — 이후 분석 무제한도
 * 그 상태를 보고 동작한다. PG가 붙으면 이 자리에 결제 토큰이 추가된다.
 */
export const subscribe = (plan: SubscriptionPlan) =>
  request<SubscriptionState>('/subscriptions/subscribe', { method: 'POST', body: { plan } });
