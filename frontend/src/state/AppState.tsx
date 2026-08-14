import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import { ApiError, isMockMode } from '@/services/api';
import * as backend from '@/services/backend';
import { clearSession, currentSession, restoreSession } from '@/services/session';
import type { AnalysisResult, Category, Inbody, Profile, RoutineTask } from '@/types/api';

export type ActionResult = { ok: boolean; message?: string };

export type ProfileDraft = {
  priorities: Category[];
  heightCm: number;
  weightKg: number;
  sleepHours?: number | null;
  inbody?: Inbody | null;
};

/** 키워드 선택 카드가 쓰는 최소 형태. */
export type KeywordChoice = { id: string; label: string };

type AppStateValue = {
  /** 세션 복원이 끝났는지. false면 라우팅을 판단하면 안 된다. */
  ready: boolean;
  /** 백엔드 연결 여부. mock이면 서버 없이 화면만 돈다. */
  mode: 'server' | 'mock';
  currentAccountId?: string;

  register: (id: string, password: string) => Promise<ActionResult>;
  login: (id: string, password: string) => Promise<ActionResult>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<ActionResult>;

  nickname: string;
  setNickname: (value: string) => Promise<void>;
  photoUri?: string;
  setPhotoUri: (value?: string) => void;
  priorities: Category[];
  setPriorities: (value: Category[]) => void;
  profile?: Profile;
  /** 사진 업로드 → 프로필 등록까지 한 번에 처리한다. */
  saveProfile: (draft: ProfileDraft) => Promise<ActionResult>;

  // ---- 고점 분석
  analysisStatusText: string;
  analysisKeywords: KeywordChoice[];
  startAnalysis: (inputText: string, imageUris: string[]) => Promise<ActionResult>;
  confirmKeywords: (keywordIds: string[]) => Promise<ActionResult>;

  result?: AnalysisResult;
  hasAnalysis: boolean;
  saved: boolean;
  saveToDrawer: () => Promise<ActionResult>;

  tasks: RoutineTask[];
  toggleTask: (taskId: string) => void;
  /** 결과에서 목표를 만든다. 없으면 만들고, 있으면 그대로 둔다. */
  ensureRoutine: () => Promise<ActionResult>;
};

// ---------------------------------------------------------------- mock 데이터

const demoResult: AnalysisResult = {
  resultId: 'result-demo-1', analysisId: 'analysis-demo-1', viewState: 'FRESH',
  title: '17호, 큰 눈, 귀족턱, 다...', analyzedAt: '2026-08-12T04:12:00Z',
  comparisonImage: { status: 'SKIPPED', currentUrl: null, peakUrl: null },
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

const mockKeywords: KeywordChoice[] = [
  { id: 'k1', label: '다이아몬드형' }, { id: 'k2', label: '귀족턱' },
  { id: 'k3', label: '17호 피부' }, { id: 'k4', label: '큰 눈' },
];

const mockTasks: RoutineTask[] = Array.from({ length: 4 }, (_, index) => ({
  taskId: `task-${index + 1}`, category: 'SKIN', title: '자외선 차단제 바르기',
  timing: '매일 외출 전', durationLabel: '약 2분', amountLabel: '4ml', scheduledDate: '2026-08-14',
  status: 'PENDING',
}));

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

const AppStateContext = createContext<AppStateValue | null>(null);
const ACCOUNTS_STORAGE_KEY = '@go/mock-accounts-v1';

const createAccountData = (password: string): AccountData => ({
  password, nickname: '새로운 회원', priorities: [], hasAnalysis: false, saved: false, tasks: [],
});

const signedOutData = createAccountData('');

const messageOf = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

export function AppStateProvider({ children }: PropsWithChildren) {
  const mode = isMockMode ? 'mock' : 'server';

  // mock 모드 저장소 (서버가 없을 때만 쓴다)
  const [accounts, setAccounts] = useState<Record<string, AccountData>>({});
  const [currentAccountId, setCurrentAccountId] = useState<string>();
  const [hydrated, setHydrated] = useState(false);
  const [ready, setReady] = useState(false);

  // 서버 모드 상태
  const [nickname, setNicknameState] = useState('새로운 회원');
  const [photoUri, setPhotoUri] = useState<string>();
  const [priorities, setPriorities] = useState<Category[]>([]);
  const [profile, setProfileState] = useState<Profile>();
  const [result, setResult] = useState<AnalysisResult>();
  const [saved, setSaved] = useState(false);
  const [tasks, setTasks] = useState<RoutineTask[]>([]);
  const [analysisKeywords, setAnalysisKeywords] = useState<KeywordChoice[]>([]);
  const [analysisStatusText, setAnalysisStatusText] = useState('');
  const analysisId = useRef<string | undefined>(undefined);
  const routineId = useRef<string | undefined>(undefined);

  const account = currentAccountId ? accounts[currentAccountId] ?? signedOutData : signedOutData;

  // ---------------------------------------------------------------- 초기화

  useEffect(() => {
    if (mode === 'server') {
      restoreSession()
        .then(async (session) => {
          if (!session) return;
          setCurrentAccountId(session.userId);
          setNicknameState(session.nickname);
          // 프로필이 없을 수 있다. 없으면 등록 화면으로 가야 하므로 조용히 넘긴다.
          await backend.getProfile()
            .then((loaded) => { setProfileState(loaded); setPriorities(loaded.priorities); setPhotoUri(loaded.photoUrl ?? undefined); })
            .catch(() => undefined);
        })
        .catch(() => undefined)
        .finally(() => setReady(true));
      return;
    }

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
      .finally(() => { setHydrated(true); setReady(true); });
  }, [mode]);

  useEffect(() => {
    if (mode === 'mock' && hydrated) void AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  }, [accounts, hydrated, mode]);

  const updateAccount = useCallback((update: (current: AccountData) => AccountData) => {
    if (!currentAccountId) return;
    setAccounts((current) => {
      const existing = current[currentAccountId];
      return existing ? { ...current, [currentAccountId]: update(existing) } : current;
    });
  }, [currentAccountId]);

  const resetServerState = useCallback(() => {
    setNicknameState('새로운 회원'); setPhotoUri(undefined); setPriorities([]);
    setProfileState(undefined); setResult(undefined); setSaved(false); setTasks([]);
    setAnalysisKeywords([]); setAnalysisStatusText('');
    analysisId.current = undefined; routineId.current = undefined;
  }, []);

  // ---------------------------------------------------------------- 계정

  const register = useCallback(async (rawId: string, password: string): Promise<ActionResult> => {
    const id = rawId.trim().toLowerCase();
    if (!id) return { ok: false, message: '아이디를 입력해주세요.' };

    if (mode === 'mock') {
      if (accounts[id]) return { ok: false, message: '이미 사용 중인 아이디예요.' };
      setAccounts((current) => ({ ...current, [id]: createAccountData(password) }));
      setCurrentAccountId(id);
      return { ok: true };
    }
    try {
      // 닉네임은 다음 화면(이름 설정)에서 받는다. 여기서는 기본값으로 만들어둔다.
      const session = await backend.signup(id, password, '새로운 회원');
      resetServerState();
      setCurrentAccountId(session.userId);
      setNicknameState(session.nickname);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: messageOf(error, '회원가입에 실패했어요.') };
    }
  }, [accounts, mode, resetServerState]);

  const login = useCallback(async (rawId: string, password: string): Promise<ActionResult> => {
    const id = rawId.trim().toLowerCase();

    if (mode === 'mock') {
      const found = accounts[id];
      if (!found) return { ok: false, message: '존재하지 않거나 삭제된 계정이에요. 회원가입을 진행해주세요.' };
      if (found.password !== password) return { ok: false, message: '비밀번호가 일치하지 않아요.' };
      setCurrentAccountId(id);
      return { ok: true };
    }
    try {
      const session = await backend.login(id, password);
      resetServerState();
      setCurrentAccountId(session.userId);
      setNicknameState(session.nickname);
      const loaded = await backend.getProfile().catch(() => undefined);
      if (loaded) { setProfileState(loaded); setPriorities(loaded.priorities); setPhotoUri(loaded.photoUrl ?? undefined); }
      return { ok: true };
    } catch (error) {
      // 서버는 "없는 계정"과 "비밀번호 틀림"을 구분해 알려주지 않는다.
      // 계정 존재 여부가 새어나가지 않게 하려는 의도다. (API.md §4)
      return { ok: false, message: messageOf(error, '로그인에 실패했어요.') };
    }
  }, [accounts, mode, resetServerState]);

  const logout = useCallback(async () => {
    if (mode === 'server') { await backend.logout().catch(() => clearSession()); resetServerState(); }
    setCurrentAccountId(undefined);
  }, [mode, resetServerState]);

  const deleteAccount = useCallback(async (): Promise<ActionResult> => {
    if (mode === 'mock') {
      if (!currentAccountId) return { ok: true };
      setAccounts((current) => { const next = { ...current }; delete next[currentAccountId]; return next; });
      setCurrentAccountId(undefined);
      return { ok: true };
    }
    try {
      await backend.deleteAccount();
      resetServerState();
      setCurrentAccountId(undefined);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: messageOf(error, '계정을 삭제하지 못했어요.') };
    }
  }, [currentAccountId, mode, resetServerState]);

  const setNickname = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (mode === 'mock') { updateAccount((current) => ({ ...current, nickname: trimmed })); return; }
    setNicknameState(trimmed);
    await backend.updateNickname(trimmed).catch(() => undefined);
  }, [mode, updateAccount]);

  // ---------------------------------------------------------------- 프로필

  const saveProfile = useCallback(async (draft: ProfileDraft): Promise<ActionResult> => {
    if (mode === 'mock') {
      updateAccount((current) => ({
        ...current,
        priorities: draft.priorities,
        profile: {
          profileId: current.profile?.profileId ?? 'profile-demo',
          photoUrl: current.photoUri ?? null,
          priorities: draft.priorities,
          heightCm: draft.heightCm,
          weightKg: draft.weightKg,
          sleepHours: draft.sleepHours ?? null,
          inbody: draft.inbody ?? null,
        },
      }));
      return { ok: true };
    }
    if (!photoUri) return { ok: false, message: '사진을 먼저 등록해주세요.' };

    try {
      // 이미 등록된 프로필의 사진을 그대로 쓰는 경우(수정)에는 다시 올리지 않는다.
      const photoKey = photoUri.startsWith('http')
        ? undefined
        : await backend.uploadImage('PROFILE_PHOTO', photoUri);

      const created = photoKey
        ? await backend.createProfile({ photoKey, ...draft })
        : await backend.updateProfileBody({ weightKg: draft.weightKg, sleepHours: draft.sleepHours, inbody: draft.inbody });

      setProfileState(created);
      setPriorities(created.priorities);
      setPhotoUri(created.photoUrl ?? undefined);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: messageOf(error, '프로필을 저장하지 못했어요.') };
    }
  }, [mode, photoUri, updateAccount]);

  // ---------------------------------------------------------------- 고점 분석

  const startAnalysis = useCallback(async (inputText: string, imageUris: string[]): Promise<ActionResult> => {
    if (mode === 'mock') {
      setAnalysisKeywords(mockKeywords);
      setAnalysisStatusText('키워드를 찾고 있어요.');
      return { ok: true };
    }
    try {
      setAnalysisStatusText('참고 사진을 올리고 있어요.');
      const keys: string[] = [];
      for (const uri of imageUris) keys.push(await backend.uploadImage('REFERENCE_IMAGE', uri));

      const accepted = await backend.createAnalysis(inputText, keys);
      analysisId.current = accepted.analysisId;
      setAnalysisKeywords([]);

      await backend.pollAnalysis(
        accepted.analysisId,
        (progress) => progress.status === 'KEYWORDS_READY',
        (progress) => setAnalysisStatusText(progress.message),
      );

      const keywords = await backend.getKeywords(accepted.analysisId);
      setAnalysisKeywords(keywords.keywords.map((keyword) => ({ id: keyword.id, label: keyword.label })));
      return { ok: true };
    } catch (error) {
      setAnalysisStatusText('');
      return { ok: false, message: messageOf(error, '분석을 시작하지 못했어요.') };
    }
  }, [mode]);

  /**
   * 비교 이미지가 끝날 때까지 뒤에서 지켜본다.
   *
   * 실측 35초쯤 걸린다. 사용자를 그동안 붙잡아두지 않고 결과 화면을 먼저 보여준 뒤
   * 이미지 자리만 교체한다. 실패하면 그대로 두면 되므로 오류를 삼킨다.
   */
  const watchImage = useCallback(async (id: string) => {
    for (let attempt = 0; attempt < 40; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      try {
        const progress = await backend.getAnalysisProgress(id);
        if (progress.imageStatus === 'PENDING') continue;
        setResult(await backend.getResult(id));
        return;
      } catch {
        return;
      }
    }
  }, []);

  const confirmKeywords = useCallback(async (keywordIds: string[]): Promise<ActionResult> => {
    if (mode === 'mock') {
      setResult(demoResult); setSaved(false); setTasks(mockTasks.map((task) => ({ ...task })));
      updateAccount((current) => ({ ...current, hasAnalysis: true, saved: false, tasks: mockTasks.map((task) => ({ ...task })) }));
      return { ok: true };
    }
    const id = analysisId.current;
    if (!id) return { ok: false, message: '분석 정보를 찾지 못했어요.' };

    try {
      await backend.selectKeywords(id, keywordIds);
      await backend.pollAnalysis(
        id,
        (progress) => progress.status === 'DONE',
        (progress) => setAnalysisStatusText(progress.message),
      );
      const loaded = await backend.getResult(id);
      setResult(loaded);
      setSaved(loaded.saved);

      // 텍스트 결과는 나왔지만 비교 이미지는 아직 만들어지는 중일 수 있다.
      // 결과 화면을 먼저 띄우고, 이미지가 도착하면 조용히 교체한다. (API.md §6.4)
      if (loaded.comparisonImage.status === 'PENDING') void watchImage(id);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: messageOf(error, '결과를 만들지 못했어요.') };
    }
  }, [mode, updateAccount, watchImage]);

  const saveToDrawer = useCallback(async (): Promise<ActionResult> => {
    if (mode === 'mock') { setSaved(true); updateAccount((current) => ({ ...current, saved: true })); return { ok: true }; }
    const id = analysisId.current;
    if (!id) return { ok: false, message: '저장할 결과가 없어요.' };
    try {
      await backend.saveResultToDrawer(id);
      setSaved(true);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: messageOf(error, '서랍에 저장하지 못했어요.') };
    }
  }, [mode, updateAccount]);

  // ---------------------------------------------------------------- 목표

  const ensureRoutine = useCallback(async (): Promise<ActionResult> => {
    if (mode === 'mock') { return { ok: true }; }
    if (routineId.current) return { ok: true };
    if (!result) return { ok: false, message: '먼저 분석 결과를 만들어주세요.' };

    try {
      const created = await backend.createRoutineFromAnalysis(result.resultId);
      const routine = created.routines[0];
      if (!routine) return { ok: false, message: '목표를 만들지 못했어요.' };
      routineId.current = routine.routineId;

      const detail = await backend.getRoutine(routine.routineId);
      setTasks(detail.tasks);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: messageOf(error, '목표를 만들지 못했어요.') };
    }
  }, [mode, result]);

  const toggleTask = useCallback((taskId: string) => {
    if (mode === 'mock') {
      updateAccount((current) => ({
        ...current,
        tasks: current.tasks.map((task) => task.taskId === taskId
          ? { ...task, status: task.status === 'DONE' ? 'PENDING' : 'DONE' }
          : task),
      }));
      return;
    }
    // 낙관적 갱신 — 체크는 즉시 보여주고 서버 확인은 뒤따른다.
    let next: 'DONE' | 'PENDING' = 'DONE';
    setTasks((current) => current.map((task) => {
      if (task.taskId !== taskId) return task;
      next = task.status === 'DONE' ? 'PENDING' : 'DONE';
      return { ...task, status: next };
    }));
    void backend.updateTaskStatus(taskId, next).catch(() => {
      // 실패하면 되돌린다. 화면과 서버가 갈라진 채로 두지 않는다.
      setTasks((current) => current.map((task) => task.taskId === taskId
        ? { ...task, status: next === 'DONE' ? 'PENDING' : 'DONE' }
        : task));
    });
  }, [mode, updateAccount]);

  // ---------------------------------------------------------------- 조립

  const serverMode = mode === 'server';

  const value = useMemo<AppStateValue>(() => ({
    ready,
    mode,
    currentAccountId,
    register, login, logout, deleteAccount,
    nickname: serverMode ? nickname : account.nickname,
    setNickname,
    photoUri: serverMode ? photoUri : account.photoUri,
    setPhotoUri,
    priorities: serverMode ? priorities : account.priorities,
    setPriorities,
    profile: serverMode ? profile : account.profile,
    saveProfile,
    analysisStatusText,
    analysisKeywords,
    startAnalysis,
    confirmKeywords,
    result: serverMode ? result : (account.hasAnalysis ? demoResult : undefined),
    hasAnalysis: serverMode ? Boolean(result) : account.hasAnalysis,
    saved: serverMode ? saved : account.saved,
    saveToDrawer,
    tasks: serverMode ? tasks : account.tasks,
    toggleTask,
    ensureRoutine,
  }), [
    account, analysisKeywords, analysisStatusText, confirmKeywords, currentAccountId, deleteAccount,
    ensureRoutine, login, logout, mode, nickname, photoUri, priorities, profile, ready, register,
    result, saveProfile, saveToDrawer, saved, serverMode, setNickname, startAnalysis, tasks, toggleTask,
  ]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState must be used inside AppStateProvider');
  return value;
}

/** 현재 로그인 세션의 사용자 id. 화면 밖(서비스)에서 필요할 때 쓴다. */
export const signedInUserId = () => currentSession()?.userId;
