import { toIsoDate } from '@/lib/date';
import type { AnalysisStatus, Category, Profile, RoutineTask } from '@/types/api';

const wait = (ms = 350) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function saveMockProfile(input: Omit<Profile, 'profileId'>): Promise<Profile> {
  await wait();
  return { profileId: `profile-${Date.now()}`, ...input };
}

export async function createMockAnalysis(inputText: string, referenceImageKeys: string[]) {
  await wait();
  if (inputText.trim().length < 10 || inputText.length > 500) throw new Error('원하는 이미지는 10~500자로 입력해주세요.');
  return { analysisId: `analysis-${Date.now()}`, inputText, referenceImageKeys, status: 'CREATED' as AnalysisStatus };
}

export async function pollMockAnalysis(onStatus: (status: AnalysisStatus) => void) {
  for (const status of ['EXTRACTING', 'KEYWORDS_READY'] as AnalysisStatus[]) { await wait(900); onStatus(status); }
}

export async function createMockRoutine(sourceType: 'FROM_ANALYSIS' | 'STANDALONE', categories: Category[]): Promise<RoutineTask[]> {
  await wait();
  return categories.map((category, index) => ({ taskId: `task-${index}`, category, title: '자외선 차단제 바르기', timing: '매일 외출 전', durationLabel: '약 2분', amountLabel: '4ml', scheduledDate: toIsoDate(new Date()), status: 'PENDING', sourceType } as RoutineTask & { sourceType: typeof sourceType }));
}
