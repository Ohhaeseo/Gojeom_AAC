# GO. 프론트엔드

GO. 모바일 앱의 Expo React Native 프론트엔드입니다. iPhone을 우선 대상으로 하며, 현재 전체 사용자 흐름은 프론트 mock 데이터로 동작합니다.

## 기술 스택

- Expo SDK 54 / React Native 0.81 / React 19
- TypeScript / Expo Router
- React Native SVG, Expo Image Picker, Expo Blur
- AsyncStorage 기반 로컬 세션·데모 상태
- Pretendard 로컬 폰트

## 빠른 실행

저장소를 처음 받는 팀원은 프론트 브랜치를 선택합니다.

```bash
git clone https://github.com/Ohhaeseo/Gojeom_AAC.git
cd Gojeom_AAC
git switch frontend
cd frontend
```

Windows PowerShell:

```powershell
npm ci
Copy-Item .env.example .env
npm run start
```

macOS / Linux:

```bash
npm ci
cp .env.example .env
npm run start
```

재현 가능한 설치를 위해 Node `24.15.0`과 커밋된 `package-lock.json`을 기준으로 합니다. nvm/asdf 사용자는 `.nvmrc` 또는 `.node-version`으로 같은 버전을 선택할 수 있습니다.

Metro에 표시되는 QR을 iPhone의 Expo Go로 스캔합니다. 상세 절차와 오류 해결은 [SIMULATION_GUIDE.md](SIMULATION_GUIDE.md)를 확인하세요.

## 현재 구현 범위

- 실행 로고 모션, 로그인·회원가입 UI, 이름 설정
- 프로필 사진·우선순위·키/몸무게·수면/인바디 등록
- 프로필 분석 로딩/완료와 홈·프로필·설정
- 고점 입력, 참고 이미지 선택, 분석 상태·키워드 선택·결과
- 결과 저장, 서랍, 목표 생성, 루틴 상세와 완료 진행률
- 빈 상태, 삭제/이탈 모달, 오류·재시도 UI
- 공통 고정 헤더, 하단 네비게이션, 스위치, 버튼, 브랜드 로고 모션

소셜 로그인은 버튼과 로고만 구현되어 있습니다. 실제 OAuth, 사용자 인증, 데이터 영속화, 이미지 저장, AI 처리, 푸시 알림은 백엔드 연결이 필요합니다.

## 백엔드 팀 연동 안내

### 계약 정본

프론트와 백엔드의 계약 정본은 저장소 루트의 [API.md](../API.md)입니다. `frontend/docs/API_SPEC.md`는 초기 초안이므로 구현 판단에 사용하지 않습니다.

- API Base: `https://{host}/api/v1`
- JSON 필드: `camelCase`
- 성공: `{ "success": true, "data": ... }`
- 실패: `{ "success": false, "error": { "code", "message", "details" } }`
- 날짜: ISO-8601 UTC. KST 변환은 프론트가 담당합니다.
- 인증: `Authorization: Bearer {accessToken}`

공개 Base URL만 `frontend/.env`에 둡니다.

```env
EXPO_PUBLIC_API_BASE_URL=https://api.example.com/api/v1
```

OpenAI 키, 스토리지 Secret, JWT Secret, PG 키 등 비밀값은 프론트 번들에 넣으면 안 됩니다.

### 현재 연결 지점

- 공통 HTTP 래퍼: `src/services/api.ts` — 봉투 해제 · 토큰 주입 · 401 시 refresh 후 1회 재시도 · 타임아웃
- 세션 보관: `src/services/session.ts` — AsyncStorage
- **백엔드 어댑터: `src/services/backend.ts`** — 엔드포인트별 타입 함수
- mock 서비스: `src/services/mockApi.ts`
- API 공통 타입: `src/types/api.ts`
- 화면/세션 상태: `src/state/AppState.tsx`

`EXPO_PUBLIC_API_BASE_URL`이 **없으면 mock, 있으면 실제 백엔드**에 붙습니다
(`AppState`의 `mode`가 `'mock' | 'server'`). 화면은 `fetch`를 직접 부르지 않고
`useAppState()`의 동작만 호출합니다.

붙어 있는 흐름 — 회원가입·로그인·로그아웃·계정삭제 / 닉네임 / 사진 업로드 →
프로필 등록 / 고점 분석(생성 → 폴링 → 키워드 선택 → 결과) / 서랍 저장 /
목표 생성·완료 체크.

`src/services/backend.ts`에는 화면이 아직 쓰지 않는 함수도 있습니다 —
`getDrawer` · `getSavedResult` · `deleteSavedResult` · `scanInbody` ·
`createStandaloneRoutine` · `listRoutines` · `deleteRoutine` ·
`updateNotificationSettings` · `deleteAllAnalyses`. 해당 화면을 붙일 때
그대로 호출하면 됩니다.

#### 로컬에서 백엔드와 함께 실행

```bash
# 1) 백엔드 (다른 터미널)
cd backend && SPRING_PROFILES_ACTIVE=local ./gradlew bootRun

# 2) 프론트
echo "EXPO_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1" > frontend/.env
cd frontend && npm install && npx expo start --web
```

- **Expo 웹은 8081 포트**를 쓰므로 백엔드의 `CORS_ALLOWED_ORIGINS`에 `http://localhost:8081`을 추가해야 합니다.
- **실기기에서는 `localhost`가 아니라 PC의 LAN IP**를 넣어야 합니다.
- 웹 브라우저에서 사진 업로드를 시험하려면 **S3 버킷 CORS의 `AllowedOrigins`에도** 그 주소가 있어야 합니다. 실기기는 CORS 대상이 아니라 그대로 동작합니다.

### 반드시 맞춰야 하는 규칙

1. Access Token 만료 시 `AUTH_TOKEN_EXPIRED`를 반환합니다. 프론트는 refresh 후 원 요청을 한 번만 재시도합니다.
2. 계정 삭제 후 기존 토큰과 refresh token을 모두 무효화해야 합니다. 모든 사용자 데이터는 계정 ID로 격리되어야 합니다.
3. 이미지는 `POST /uploads/presigned`로 URL을 받은 뒤 스토리지에 직접 PUT합니다. 서버 multipart 업로드를 사용하지 않습니다.
4. 조회용 이미지 URL은 10분 만료이므로 영구 식별자로 쓰지 않습니다. API에는 `objectKey`를 전달합니다.
5. `priorities` 배열 순서가 1~3순위입니다. `SKIN`, `BODY`, `HEALTH`를 중복 없이 정확히 한 번씩 받습니다.
6. 평균 수면 시간은 `0~14`, `0.5` 단위입니다. 키는 `100~250cm`, 몸무게는 `30~200kg`입니다.
7. 분석 상태는 `CREATED → EXTRACTING → KEYWORDS_READY → GENERATING → DONE`입니다. `GET /analyses/{id}`의 `pollAfterMs`를 제공해 주세요.
8. `KEYWORDS_READY`에서도 상태 조회는 계속됩니다. 분석 전체 폴링 상한은 60초입니다.
9. 키워드 확정은 1~4개이며 `KeywordCategory`만 `FACE`를 포함합니다. 프로필/루틴의 `Category`에는 `FACE`가 없습니다.
10. 결과의 `comparisonImage.status`는 `SKIPPED | PENDING | DONE | FAILED`를 모두 지원해야 합니다.
11. 결과 `disclaimer`와 `categoryChanges` 3건은 필수입니다. 외모 점수·등급·순위 필드는 만들지 않습니다.
12. 결과는 자동 저장하지 않습니다. `POST /analyses/{id}/result/save` 호출 때만 서랍에 저장합니다.
13. 루틴 생성 응답의 `routines`는 항상 배열입니다. `FROM_ANALYSIS`와 `STANDALONE` 두 경로를 지원합니다.
14. `204` 응답은 JSON body가 없으므로 공통 HTTP 파서가 빈 응답을 처리할 수 있어야 합니다.

### 백엔드 준비 완료 시 필요한 값

- 개발/스테이징 API Base URL
- CORS 및 실제 iPhone LAN/HTTPS 접근 허용 여부
- JWT 저장·재발급 정책과 refresh token 전달 방식
- presigned PUT에 필요한 헤더와 허용 content type
- 분석 상태별 최소 mock/fixture ID
- 에러 코드별 테스트 계정 또는 재현 방법
- 계정 삭제 및 사진/분석 삭제의 실제 보관 정책

### 프론트가 기대하는 주요 API

전체 36개 엔드포인트와 스키마는 루트 `API.md`를 따릅니다. 최초 통합에 필요한 핵심 순서는 다음과 같습니다.

1. `/auth/signup`, `/auth/login`, `/auth/refresh`, `/users/me`
2. `/uploads/presigned`, `/profiles`, `/profiles/me`
3. `/analyses`, `/analyses/{id}`, 키워드 조회·선택, 결과 조회·저장
4. `/saved-results`, `/routines`, `/routine-tasks/{id}`
5. 알림 설정과 삭제 API

## 프로젝트 구조

```text
frontend/
├─ assets/               로고, 아이콘, 폰트, 시각 검수 에셋
├─ docs/                 프론트 구현·디자인 분석 문서
├─ src/app/              Expo Router 화면
├─ src/components/       공통 UI와 브랜드 모션
├─ src/mocks/            API 형태의 데모 데이터
├─ src/services/         HTTP·mock 서비스
├─ src/state/            세션 및 앱 상태
├─ src/theme/            색상·간격·타이포 토큰
└─ src/types/            API·도메인 타입
```

## 검증

```powershell
npm run typecheck
npm run lint
```

구현 판단은 저장소 루트 `API.md`, `frontend/docs/FRONTEND_IMPLEMENTATION.md`, 최신 Figma 순서로 확인합니다.
