export type Provider = 'LOCAL' | 'GOOGLE';
export type Category = 'SKIN' | 'BODY' | 'HEALTH';
export type KeywordCategory = Category | 'FACE';
export type AnalysisStatus = 'CREATED' | 'EXTRACTING' | 'KEYWORDS_READY' | 'GENERATING' | 'DONE' | 'FAILED';
export type ImageStatus = 'SKIPPED' | 'PENDING' | 'DONE' | 'FAILED';
export type ResultViewState = 'FRESH' | 'SAVED';
export type TaskStatus = 'PENDING' | 'DONE' | 'MISSED';
export type RoutineSourceType = 'FROM_ANALYSIS' | 'STANDALONE';

export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = { success: false; error: { code: string; message: string; details?: unknown } };
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type Inbody = {
  bodyWaterL?: number | null;
  proteinKg?: number | null;
  mineralKg?: number | null;
  bodyFatKg?: number | null;
  skeletalMuscleKg?: number | null;
  bmi?: number | null;
};

/** 프로필 사진을 얼마나 읽을 수 있었는지. 사진에 대한 말이지 사용자에 대한 말이 아니다. */
export type CaptureReadability = 'CLEAR' | 'PARTIAL' | 'LIMITED';

export type CaptureIssue =
  | 'DARK'
  | 'BACKLIT'
  | 'BLURRY'
  | 'FACE_TOO_SMALL'
  | 'OCCLUDED'
  | 'HEAVY_FILTER'
  | 'MULTIPLE_FACES'
  | 'NO_FACE';

export type CaptureQuality = { readability: CaptureReadability; issues: CaptureIssue[] };

/**
 * 사진 기반 현재 상태 요약. 서버가 프로필 생성 직후 비동기로 채운다.
 *
 * **분석이 끝나기 전에는 통째로 없다.** 실패해도 null로 남는다 — 프로필 등록 자체는
 * 성공이므로 이것이 없다고 화면이 깨지면 안 된다.
 *
 * `capture`는 나중에 늘린 필드라 그전에 만들어진 프로필에는 없다.
 */
export type ProfileAnalysisSummary = {
  faceImpression?: string[];
  bodyRange?: string | null;
  healthNotes?: string[];
  capture?: CaptureQuality | null;
  modelVersion?: string;
  analyzedAt?: string;
};

export type Profile = {
  profileId: string;
  photoUrl: string | null;
  priorities: Category[];
  heightCm: number;
  weightKg: number;
  sleepHours?: number | null;
  inbody?: Inbody | null;
  analysisSummary?: ProfileAnalysisSummary | null;
};

export type AnalysisResult = {
  resultId: string;
  analysisId: string;
  viewState: ResultViewState;
  title: string;
  analyzedAt: string;
  comparisonImage: { status: ImageStatus; currentUrl: string | null; peakUrl: string | null };
  overview: {
    summary: string;
    keywords: { id: string; label: string; selected: boolean }[];
    keepPoints: string[];
    emphasizePoints: string[];
    changeIntensity: string[];
  };
  categoryChanges: { category: Category; description: string }[];
  dailyCares: { title: string; description: string }[];
  saved: boolean;
  disclaimer: string;
};

export type RoutineTask = {
  taskId: string;
  /**
   * 어느 목표의 태스크인지. **서버가 주지 않는다** — 목표를 여러 개 합쳐 올릴 때
   * 화면이 붙인다. 합친 목록에서 회차를 목표별로 고르려면 출처를 알아야 한다.
   */
  routineId?: string;
  category: Category;
  title: string;
  timing: string;
  durationLabel: string;
  amountLabel: string;
  scheduledDate: string;
  /**
   * 이 배정이 속한 주의 첫날. **ISO 월요일이 아니라 목표 시작일 기준**이다.
   * 주 N회의 "그 주"를 세는 기준이라 서버가 정해서 내려준다. (V15)
   */
  weekStart?: string;
  /**
   * 그 주에 몇 번 하면 되는지. **null이면 매일 하는 일**이라 그날 한 번으로 끝난다.
   *
   * 값이 있으면 그 주의 **모든 날**에 배정이 있고, 그중 이 수만큼 체크하면 채워진다.
   * 화면은 "이번 주 2/3"처럼 진행을 보여줘야 한다 — 안 그러면 사용자가 매일 해야
   * 하는 일로 읽는다.
   */
  weeklyTarget?: number | null;
  status: TaskStatus;
};
