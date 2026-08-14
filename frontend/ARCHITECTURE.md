# GO. 프론트엔드 아키텍처

이 문서는 초기 React/Vite 웹 초안을 대체하며, 현재 Expo React Native 구현 구조를 설명합니다.

## 런타임

- Expo SDK 54, React Native 0.81, React 19
- TypeScript strict mode
- Expo Router 파일 기반 라우팅
- iPhone / Expo Go 우선 검수
- `@/*` 별칭은 `frontend/src/*`를 가리킵니다.

## 계층

```text
src/app/          화면 조합과 라우팅
src/components/   재사용 UI, 레이아웃, 로고 모션, 네비게이션
src/state/        로그인 사용자와 데모 앱 상태
src/services/     공통 HTTP 클라이언트와 mock 서비스
src/types/        API 계약과 도메인 타입
src/mocks/        화면 시연 fixture
src/theme/        디자인 토큰
assets/           런타임 로고, 아이콘, 이미지, Pretendard
```

## 데이터 흐름

```text
Screen → AppState / service interface → mock adapter (현재)
                                    → HTTP adapter (백엔드 연동 후)
```

화면 컴포넌트에 개별 `fetch`를 추가하지 않습니다. `src/services/api.ts`의 공통 응답·오류 처리를 사용하고, 인증 refresh·presigned 업로드·분석 폴링은 service 계층에서 캡슐화합니다.

## 상태 소유권

- 라우트 파라미터: 화면을 다시 열 수 있는 ID와 출처(`source`)
- AppState: 현재 사용자, 프로필 작성 상태, 저장 결과, 루틴 데모 상태
- 화면 로컬 상태: 입력 중 값, 모달 열림, 일시적인 애니메이션 단계
- 백엔드 연동 후 서버 정본: 사용자, 프로필, 분석, 저장 결과, 루틴, 알림 설정

실제 계정 연결 후에는 서버 데이터가 계정 ID별로 분리되어야 하며 로그아웃/계정 삭제 시 사용자별 로컬 캐시도 함께 비웁니다.

## API 계약

저장소 루트 `API.md`가 정본입니다. Base URL은 `EXPO_PUBLIC_API_BASE_URL` 하나만 사용합니다. 인증 토큰·비밀키·AI 공급자 키는 이 저장소나 Expo 공개 환경변수에 넣지 않습니다.

분석은 `GET /analyses/{id}` 단일 폴링으로 추적하고 서버의 `pollAfterMs`를 존중합니다. `KEYWORDS_READY`에서도 폴링을 유지하며 전체 상한은 60초입니다.

## 이식성과 재현성

- Node 버전: `.nvmrc`, `.node-version`
- npm 의존성: `package-lock.json` + `npm ci`
- 모든 런타임 에셋과 폰트: `frontend/assets`
- 개인 PC 절대경로: 런타임 코드에서 사용 금지
- 로컬 환경값: `.env`(Git 제외), 공유 예시: `.env.example`

실행과 검증 절차는 `SIMULATION_GUIDE.md`를 따릅니다.
