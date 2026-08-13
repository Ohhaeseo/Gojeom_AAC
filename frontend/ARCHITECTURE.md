# GO. — Frontend 구조 설계

| 항목 | 내용 |
| --- | --- |
| 문서 버전 | v1.0 |
| 최종 수정일 | 2026-08-13 |
| 기준 문서 | [PRD.md](../PRD.md) · [design.md](../design.md) · [API.md](../API.md) |

---

## 1. 기술 스택

| 영역 | 선택 | 이유 |
| --- | --- | --- |
| Framework | React 18 · TypeScript | |
| Build | Vite | 개발 서버 속도, 설정 부담 적음 |
| 라우팅 | React Router v6 | |
| **서버 상태** | **TanStack Query** | 분석 진행 폴링(`refetchInterval`)이 핵심 요구사항 |
| 클라이언트 상태 | Zustand | 전역 상태가 적어 Redux는 과함 |
| 폼 | React Hook Form + Zod | 프로필 입력 폼의 필드가 많고 검증 규칙이 복잡 |
| 스타일 | CSS Modules + CSS Variables | design.md 토큰을 CSS 변수로 그대로 옮김 |
| HTTP | Axios | 인터셉터로 토큰 갱신·에러 봉투 처리 |
| 이미지 검증 | `@mediapipe/tasks-vision` | 업로드 전 얼굴 1차 검증 |

> 상태 관리를 서버/클라이언트로 나눈 이유 — 이 앱의 상태는 대부분 서버 데이터(분석 진행, 결과, 목표)다. 클라이언트 전용 상태는 토큰과 온보딩 단계 정도라 Zustand로 충분하다.

---

## 2. 디렉터리 구조

```text
frontend/
├─ public/
├─ src/
│  ├─ app/                        앱 부트스트랩
│  │  ├─ App.tsx
│  │  ├─ router.tsx               라우트 정의 · 가드
│  │  ├─ providers.tsx            QueryClient · Router · ErrorBoundary
│  │  └─ queryClient.ts
│  │
│  ├─ pages/                      라우트 단위 = 시안 화면과 1:1
│  │  ├─ auth/
│  │  │  ├─ StartPage.tsx             02 로그인/회원가입 선택
│  │  │  ├─ LoginPage.tsx             03 로그인
│  │  │  └─ SignUpPage.tsx            03-1 회원가입
│  │  ├─ home/
│  │  │  └─ HomePage.tsx              04 홈 (프로필 유/무 분기)
│  │  ├─ profile/
│  │  │  ├─ ProfileSetupPage.tsx      05~08 단일 스크롤 폼
│  │  │  ├─ ProfileAnalyzingPage.tsx  10 프로필 분석 중
│  │  │  ├─ ProfilePage.tsx           11 프로필
│  │  │  └─ SettingsPage.tsx          12 설정
│  │  ├─ analysis/
│  │  │  ├─ PeakInputPage.tsx         12 고점 등록
│  │  │  ├─ AnalyzingPage.tsx         13~16 분석 중 (키워드 오버레이 포함)
│  │  │  └─ ResultPage.tsx            17·20 결과지 (viewState 분기)
│  │  ├─ drawer/
│  │  │  └─ DrawerPage.tsx            19 서랍 (3섹션)
│  │  └─ routine/
│  │     ├─ RoutineEntryPage.tsx      경로 선택        〔시안 없음〕
│  │     ├─ RoutineFromResultPage.tsx 경로 A 결과 선택 〔시안 없음〕
│  │     ├─ RoutineStandalonePage.tsx 경로 B 카테고리·기간 〔시안 없음〕
│  │     ├─ RoutineBuildingPage.tsx   21·22 설계 중·완료
│  │     └─ RoutinePage.tsx           23 목표
│  │
│  ├─ features/                   도메인 로직 (훅 · 타입 · 쿼리)
│  │  ├─ auth/
│  │  │  ├─ api.ts                 엔드포인트 호출
│  │  │  ├─ queries.ts             useLogin, useMe …
│  │  │  ├─ store.ts               토큰 보관 (Zustand)
│  │  │  └─ types.ts
│  │  ├─ profile/
│  │  │  ├─ api.ts · queries.ts · types.ts
│  │  │  └─ schema.ts              Zod 검증 (키 100~250 등)
│  │  ├─ analysis/
│  │  │  ├─ api.ts · queries.ts · types.ts
│  │  │  └─ useAnalysisPolling.ts  ★ 상태 폴링 훅
│  │  ├─ drawer/
│  │  ├─ routine/
│  │  └─ subscription/
│  │
│  ├─ shared/
│  │  ├─ api/
│  │  │  ├─ client.ts              Axios 인스턴스 · 인터셉터
│  │  │  ├─ unwrap.ts              { success, data } 봉투 해제
│  │  │  ├─ errors.ts              에러 코드 타입 · 판별 유틸
│  │  │  └─ upload.ts              presigned 발급 → 직접 PUT
│  │  ├─ ui/                       design.md §4 컴포넌트 (§3 대응표)
│  │  ├─ layout/
│  │  │  ├─ AppLayout.tsx          Bottom Navigation 고정 레이아웃
│  │  │  ├─ Header.tsx
│  │  │  └─ BottomNavigation.tsx
│  │  ├─ hooks/
│  │  │  ├─ useFaceDetection.ts    MediaPipe 1차 검증
│  │  │  └─ useObjectUrl.ts
│  │  ├─ lib/
│  │  │  ├─ format.ts              날짜·단위 포맷 (BMI 단위 없음)
│  │  │  └─ constants.ts           카테고리 라벨 매핑 등
│  │  └─ styles/
│  │     ├─ tokens.css             ★ design.md §2 토큰
│  │     ├─ reset.css
│  │     └─ typography.css
│  │
│  ├─ main.tsx
│  └─ vite-env.d.ts
│
├─ .env.example
├─ index.html
├─ package.json
├─ tsconfig.json
└─ vite.config.ts
```

### 구조 원칙

| # | 원칙 |
| --- | --- |
| S-1 | `pages`는 **조립만** 한다. 데이터 로딩은 `features`의 훅, 표현은 `shared/ui`가 맡는다. |
| S-2 | `features/*`는 서로를 import하지 않는다. 공유가 필요하면 `shared`로 올린다. |
| S-3 | `shared/ui`는 도메인을 모른다. `analysisId` 같은 인자를 받지 않는다. |
| S-4 | API 타입은 `features/*/types.ts`에 두고 **[API.md](../API.md)의 필드명을 그대로** 쓴다. 임의 변환하지 않는다. |
| S-5 | 색·간격·radius를 컴포넌트에 하드코딩하지 않는다. 반드시 `tokens.css` 변수를 쓴다. |

---

## 3. shared/ui — design.md 대응표

`shared/ui`의 파일은 [design.md](../design.md) §4와 1:1로 대응시킨다.

| design.md | 파일 | 비고 |
| --- | --- | --- |
| §4.1 Button | `Button.tsx` | variant: `primary` `utility` `danger` `neutral` `outline` |
| §4.2 Input | `Input.tsx` `InputGroup.tsx` `UnitInput.tsx` `Textarea.tsx` `Select.tsx` | |
| §4.3 Checkbox | `Checkbox.tsx` | |
| §4.4 Toggle | `Toggle.tsx` | |
| §4.5 Chip | `FilterChip.tsx` `PriorityChip.tsx` `CategoryChip.tsx` `KeywordChip.tsx` | 4종 |
| §4.6 Card | `Card.tsx` `ListCard.tsx` | |
| §4.7 Progress Bar | `ProgressBar.tsx` | |
| §4.8 Progress Ring | `ProgressRing.tsx` | |
| §4.9 Comparison Slider | `ComparisonSlider.tsx` | ★ 핵심 UI |
| §4.10 Image | `ImageBox.tsx` | 4:3 · placeholder |
| §4.11 Thumbnail Strip | `ThumbnailStrip.tsx` | |
| §4.12 Modal | `Modal.tsx` `ConfirmModal.tsx` | 안전 선택이 위 |
| §4.13 Overlay Card | `BlurOverlayCard.tsx` | |
| §4.14 Bottom Navigation | `layout/BottomNavigation.tsx` | |
| §4.15 Header | `layout/Header.tsx` | |
| §4.16 Disclaimer | `Disclaimer.tsx` | **결과 화면 필수** |
| §4.17 Auto-transition | `AutoTransitionNotice.tsx` | |
| §4.18 Choice Card | `ChoiceCard.tsx` | 루틴 경로 선택 |
| §4.19 Duration Stepper | `DurationStepper.tsx` | 1~12주 |
| §4.20 Section Header | `SectionHeader.tsx` | |

---

## 4. 라우팅

```text
/                       → 인증 상태에 따라 /start 또는 /home
/start                  StartPage              (비인증)
/login  /signup         LoginPage · SignUpPage (비인증)

/home                   HomePage
/profile/setup          ProfileSetupPage
/profile/analyzing      ProfileAnalyzingPage
/profile                ProfilePage
/settings               SettingsPage

/analysis/new           PeakInputPage
/analysis/:id/progress  AnalyzingPage
/analysis/:id/result    ResultPage             viewState=FRESH
/drawer                 DrawerPage
/drawer/:savedId        ResultPage             viewState=SAVED

/routine                RoutineEntryPage       경로 선택
/routine/from-result    RoutineFromResultPage  경로 A
/routine/new            RoutineStandalonePage  경로 B
/routine/building       RoutineBuildingPage
/routine/:id            RoutinePage
```

### 가드

| 가드 | 규칙 |
| --- | --- |
| `RequireAuth` | 토큰 없으면 `/start`. 진입하려던 경로를 저장해 로그인 후 복귀 (PRD F-01) |
| `RequireProfile` | `GET /users/me`의 `hasProfile === false`면 `/profile/setup` |
| `RequireCredit` | `canAnalyze === false`면 구독 안내 (F-12 · 화면 미설계) |

`ResultPage` 하나가 두 경로(`/analysis/:id/result`, `/drawer/:savedId`)를 담당하고 응답의 `viewState`로 칩 형태·CTA·활성 탭을 분기한다. ([API.md](../API.md) C-8)

---

## 5. API 계층

### 5.1 봉투 해제

서버는 모든 응답을 `{ success, data }` 또는 `{ success, error }`로 감싼다. **해제는 한 곳에서만** 한다.

```ts
// shared/api/client.ts
api.interceptors.response.use(
  (res) => ({ ...res, data: res.data.data }),        // 성공: data만 남김
  (err) => Promise.reject(toApiError(err)),          // 실패: ApiError로 변환
);
```

```ts
// shared/api/errors.ts
export interface ApiError {
  code: ApiErrorCode;   // API.md §4의 코드
  message: string;      // 그대로 화면에 노출 가능한 한국어
  details?: unknown;
  status: number;
}
```

**`error.message`를 그대로 쓴다.** 프론트에 코드별 문구 테이블을 만들지 않는다. 코드는 UI 형태(모달/토스트/인라인)를 고르는 데만 쓴다.

### 5.2 토큰 갱신

`401 AUTH_TOKEN_EXPIRED` → refresh 1회 시도 → 원 요청 재시도. refresh도 실패하면 토큰을 비우고 `/start`로 보내되 직전 경로를 저장한다. **동시에 여러 요청이 401을 받아도 refresh는 1회만** 실행되도록 진행 중인 Promise를 공유한다.

### 5.3 이미지 업로드

서버로 multipart를 보내지 않는다. ([API.md](../API.md) C-2)

```ts
// shared/api/upload.ts
export async function uploadImage(file: File, purpose: UploadPurpose) {
  const { uploadUrl, objectKey } = await requestPresigned(purpose, file);
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },   // presigned 요청 시 보낸 값과 동일해야 함
  });
  return objectKey;
}
```

프로필 사진은 이 호출 **전에** `useFaceDetection`으로 1차 검증한다.

### 5.4 이미지 URL 캐시 금지

조회용 URL은 10분 만료다. TanStack Query의 `staleTime`을 이미지 포함 쿼리에서 **5분 이하**로 두고, localStorage에 저장하지 않는다. ([API.md](../API.md) C-3)

---

## 6. 분석 진행 폴링 ★

이 앱에서 가장 까다로운 부분이다. [API.md](../API.md) §6.4를 그대로 구현한다.

```ts
// features/analysis/useAnalysisPolling.ts
export function useAnalysisPolling(analysisId: string) {
  const startedAt = useRef(Date.now());

  return useQuery({
    queryKey: ['analysis', analysisId],
    queryFn: () => fetchAnalysis(analysisId),
    refetchInterval: (query) => {
      const d = query.state.data;
      if (!d) return 2000;

      // 60초 상한 (PRD §8.3)
      if (Date.now() - startedAt.current > 60_000) return false;

      // 텍스트 결과가 끝나도 이미지가 남아 있으면 계속 폴링
      const textDone = d.status === 'DONE' || d.status === 'FAILED';
      const imagePending = d.imageStatus === 'PENDING';
      if (textDone && !imagePending) return false;

      return d.pollAfterMs ?? 2000;
    },
  });
}
```

### 주의점 3가지

| # | 내용 |
| --- | --- |
| P-1 | **`KEYWORDS_READY`에서 폴링을 멈추지 않는다.** 시안 14는 분석이 계속 도는 동안 키워드를 고르는 구조다. 오버레이 카드를 띄운 채 폴링을 유지한다. |
| P-2 | **`DONE` 이후에도 `imageStatus === 'PENDING'`이면 계속 폴링한다.** 결과 화면을 먼저 그리고 이미지 자리에 스켈레톤을 유지하다가 교체한다. |
| P-3 | 60초 초과 시 폴링을 끊고 `ANALYSIS_TIMEOUT` UI를 띄운다. 서버가 아직 돌고 있을 수 있으므로 "다시 시도" 시 새 분석을 만든다. |

---

## 7. 디자인 토큰

design.md §2를 CSS 변수로 옮긴다. **컴포넌트에서 hex를 직접 쓰지 않는다.**

```css
/* shared/styles/tokens.css */
:root {
  --color-primary:        #6BBDA6;
  --color-primary-light:  #A1D9C6;
  --color-primary-bg:     #E5FAF1;
  --color-ink:            #121D2D;
  --color-body-muted:     #79889A;
  --color-body-muted-2:   #727876;
  --color-canvas:         #FAFFFE;
  --color-canvas-alt:     #F3FAF7;
  --color-surface:        #FFFFFF;
  --color-surface-sunken: #E8ECEA;
  --color-divider:        #E2EAE6;
  --color-danger:         #DE6569;
  --color-point:          #FC9EA0;
  --color-neutral:        #767C7A;

  --radius-sm: 8px;  --radius-md: 12px; --radius-lg: 16px;
  --radius-xl: 20px; --radius-pill: 9999px;

  --space-text: 7px;  --space-element: 17px;
  --frame-x: 22px;    --frame-top: 40px;  --frame-bottom: 20px;

  --frame-width: 458px;
  --nav-height: 110px;
}
```

**레이아웃** — 기준 폭 458px, 화면은 세로 스크롤된다(design.md §3.1). `AppLayout`이 Bottom Navigation을 고정하고 콘텐츠 하단에 `--nav-height`만큼 패딩을 준다.

---

## 8. 지켜야 할 제약

[API.md](../API.md) 부록 B의 15항목이 정본이다. 그중 프론트에서 어기기 쉬운 것:

| # | 제약 |
| --- | --- |
| 1 | **결과 화면 `disclaimer`는 항상 노출.** 접기·숨김 금지 (PRD F-07 배포 조건) |
| 2 | **점수·등급·순위 UI를 만들지 않는다** (PRD G-1) |
| 3 | `priorities`는 **배열 순서가 곧 순위**다. 정렬을 바꾸지 않는다 |
| 4 | `bmi`는 단위 접미를 붙이지 않는다 |
| 5 | 인바디 OCR 결과는 **폼에 채우기만** 하고 사용자 확인 후 저장 (PRD G-8) |
| 6 | 키워드는 미선택 상태로 시작하고 1개 미만이면 저장 버튼 `disabled` |
| 7 | "새로 분석하기"는 `outline` 버튼. `danger`(코랄)로 만들지 않는다 |
| 8 | 저장된 결과가 0개면 루틴 경로 A를 `disabled`로 두고 경로 B로 유도 |

---

## 9. 환경 변수

```text
VITE_API_BASE_URL=https://api.example.com/api/v1
```

**OpenAI 키를 프론트에 두지 않는다.** AI 호출은 전부 백엔드를 경유한다.

---

## 10. 구현 순서 제안

| 단계 | 범위 |
| --- | --- |
| 1 | `shared/styles` 토큰 → `shared/ui` 기본 컴포넌트(Button·Input·Card·Chip) |
| 2 | `shared/api` 클라이언트 + 인터셉터 + 업로드 |
| 3 | 인증 · 라우터 가드 · AppLayout · BottomNavigation |
| 4 | 프로필 등록 폼 (05~08) — 컴포넌트 대부분이 여기서 소진된다 |
| 5 | 고점 입력 → 폴링 → 키워드 오버레이 |
| 6 | 결과 화면 (ComparisonSlider · Disclaimer) |
| 7 | 서랍 · 목표 2경로 |
