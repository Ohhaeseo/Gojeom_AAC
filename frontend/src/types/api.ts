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

export type Profile = {
  profileId: string;
  photoUrl: string | null;
  priorities: Category[];
  heightCm: number;
  weightKg: number;
  sleepHours?: number | null;
  inbody?: Inbody | null;
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
  category: Category;
  title: string;
  timing: string;
  durationLabel: string;
  amountLabel: string;
  scheduledDate: string;
  status: TaskStatus;
};
