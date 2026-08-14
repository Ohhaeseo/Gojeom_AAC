import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import type { AnalysisResult, Category, Profile, RoutineTask } from '@/types/api';

type AppStateValue = {
  currentAccountId?: string;
  register: (id: string, password: string) => boolean;
  login: (id: string, password: string) => 'SUCCESS' | 'NOT_FOUND' | 'WRONG_PASSWORD';
  logout: () => void;
  deleteAccount: () => void;
  nickname: string;
  setNickname: (value: string) => void;
  photoUri?: string;
  setPhotoUri: (value?: string) => void;
  priorities: Category[];
  setPriorities: (value: Category[]) => void;
  profile?: Profile;
  setProfile: (value: Profile) => void;
  result: AnalysisResult;
  hasAnalysis: boolean;
  completeAnalysis: () => void;
  saved: boolean;
  setSaved: (value: boolean) => void;
  tasks: RoutineTask[];
  toggleTask: (taskId: string) => void;
};

type AccountData = {
  password: string;
  nickname: string;
  photoUri?: string;
  priorities: Category[];
  profile?: Profile;
  hasAnalysis: boolean;
  saved: boolean;
  tasks: RoutineTask[];
};

const demoResult: AnalysisResult = {
  resultId: 'result-demo-1', analysisId: 'analysis-demo-1', viewState: 'FRESH',
  title: '17호, 큰 눈, 귀족턱, 다...', analyzedAt: '2026-08-12T04:12:00Z',
  comparisonImage: { status: 'DONE', currentUrl: null, peakUrl: null },
  overview: {
    summary: '사용자가 구성한 정보 중심으로 이루어진 고점 요약이에요.',
    keywords: [
      { id: 'k1', label: '다이아몬드형', selected: true },
      { id: 'k3', label: '17호 피부', selected: true },
      { id: 'k4', label: '큰 눈', selected: true },
    ],
    keepPoints: ['부드러운 얼굴선', '입매'],
    emphasizePoints: ['맑은 피부 표현', '정돈된 헤어라인'],
    changeIntensity: ['일상에서 유지 가능한 변화'],
  },
  categoryChanges: [
    { category: 'SKIN', description: '수분 섭취와 균일한 피부 표현을 중심으로 관리해보세요.' },
    { category: 'BODY', description: '과한 변화보다 편안한 자세와 균형 잡힌 실루엣을 유지해보세요.' },
    { category: 'HEALTH', description: '수면 시간과 일상적인 수분 섭취부터 안정적으로 이어가 보세요.' },
  ],
  dailyCares: [
    { title: '수분 진정 루틴', description: '아침에는 자외선 관리, 저녁에는 보습 단계를 단순하게 유지해 보세요.' },
    { title: '헤어 라인 정돈', description: '얼굴선을 자연스럽게 드러내는 방향으로 가볍게 정돈해 보세요.' },
    { title: '수면 시간 안정화', description: '비슷한 시간에 잠들고 일어나는 습관을 먼저 만들어 보세요.' },
  ],
  saved: false,
  disclaimer: 'AI가 생성한 참고용 이미지와 관리 방향입니다. 피부·건강 상태에 대한 의료적 진단이나 시술 결과를 의미하지 않습니다.',
};

const initialTasks: RoutineTask[] = Array.from({ length: 4 }, (_, index) => ({
  taskId: `task-${index + 1}`, category: 'SKIN', title: '자외선 차단제 바르기',
  timing: '매일 외출 전', durationLabel: '약 2분', amountLabel: '4ml', scheduledDate: '2026-08-14',
  status: index === 0 || index === 3 ? 'DONE' : 'PENDING',
}));

const AppStateContext = createContext<AppStateValue | null>(null);
const ACCOUNTS_STORAGE_KEY = '@go/mock-accounts-v1';

const createAccountData = (password: string): AccountData => ({
  password,
  nickname: '새로운 회원',
  priorities: [],
  hasAnalysis: false,
  saved: false,
  tasks: [],
});

const signedOutData = createAccountData('');

export function AppStateProvider({ children }: PropsWithChildren) {
  const [accounts, setAccounts] = useState<Record<string, AccountData>>({});
  const [currentAccountId, setCurrentAccountId] = useState<string>();
  const [hydrated, setHydrated] = useState(false);
  const account = currentAccountId ? accounts[currentAccountId] ?? signedOutData : signedOutData;

  useEffect(() => {
    AsyncStorage.getItem(ACCOUNTS_STORAGE_KEY)
      .then((stored) => {
        if (!stored) return;
        const parsed = JSON.parse(stored) as Record<string, AccountData>;
        setAccounts(Object.fromEntries(Object.entries(parsed).map(([id, data]) => {
          const hasAnalysis = data.hasAnalysis ?? data.saved ?? false;
          return [id, { ...data, hasAnalysis, tasks: hasAnalysis ? (data.tasks ?? []) : [] }];
        })));
      })
      .catch(() => AsyncStorage.removeItem(ACCOUNTS_STORAGE_KEY))
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated) void AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  }, [accounts, hydrated]);

  const updateAccount = useCallback((update: (current: AccountData) => AccountData) => {
    if (!currentAccountId) return;
    setAccounts((current) => {
      const existing = current[currentAccountId];
      return existing ? { ...current, [currentAccountId]: update(existing) } : current;
    });
  }, [currentAccountId]);

  const register = useCallback((rawId: string, password: string) => {
    const id = rawId.trim().toLowerCase();
    if (!id || accounts[id]) return false;
    setAccounts((current) => ({ ...current, [id]: createAccountData(password) }));
    setCurrentAccountId(id);
    return true;
  }, [accounts]);

  const login = useCallback((rawId: string, password: string) => {
    const id = rawId.trim().toLowerCase(); const found = accounts[id];
    if (!found) return 'NOT_FOUND' as const;
    if (found.password !== password) return 'WRONG_PASSWORD' as const;
    setCurrentAccountId(id);
    return 'SUCCESS' as const;
  }, [accounts]);

  const logout = useCallback(() => setCurrentAccountId(undefined), []);
  const deleteAccount = useCallback(() => {
    if (!currentAccountId) return;
    setAccounts((current) => {
      const next = { ...current }; delete next[currentAccountId]; return next;
    });
    setCurrentAccountId(undefined);
  }, [currentAccountId]);

  const completeAnalysis = useCallback(() => updateAccount((current) => ({
    ...current,
    hasAnalysis: true,
    saved: false,
    tasks: initialTasks.map((task) => ({ ...task, status: 'PENDING' })),
  })), [updateAccount]);

  const value = useMemo<AppStateValue>(() => ({
    currentAccountId, register, login, logout, deleteAccount,
    nickname: account.nickname,
    setNickname: (nickname) => updateAccount((current) => ({ ...current, nickname })),
    photoUri: account.photoUri,
    setPhotoUri: (photoUri) => updateAccount((current) => ({ ...current, photoUri })),
    priorities: account.priorities,
    setPriorities: (priorities) => updateAccount((current) => ({ ...current, priorities })),
    profile: account.profile,
    setProfile: (profile) => updateAccount((current) => ({ ...current, profile })),
    result: demoResult,
    hasAnalysis: account.hasAnalysis,
    completeAnalysis,
    saved: account.saved,
    setSaved: (saved) => updateAccount((current) => ({ ...current, saved })),
    tasks: account.tasks,
    toggleTask: (taskId) => updateAccount((current) => ({ ...current, tasks: current.tasks.map((task) => task.taskId === taskId
      ? { ...task, status: task.status === 'DONE' ? 'PENDING' : 'DONE' }
      : task) })),
  }), [account, completeAnalysis, currentAccountId, deleteAccount, login, logout, register, updateAccount]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState must be used inside AppStateProvider');
  return value;
}
