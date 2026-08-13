# 백엔드 작업 목록 — 8/14(금) ~ 8/16(일)

[PLAN.md](PLAN.md)의 실행 단위. 체크하며 진행한다.

**원칙** — 목데이터·고정 응답·fixture 금지. 못 만들면 범위를 줄이되, 만든 것은 진짜로 동작한다. ([AGENTS.md](../AGENTS.md) 규칙 15)

---

## 0. 시작 전 (목요일 밤) — 🔴 블로커

**아래 3개가 정해지지 않으면 금요일 오후부터 막힌다.** 코딩보다 먼저 처리한다.

### 0-1. ✅ OpenAI 키와 모델 확정 — **완료 (8/13)**

- [x] API 키 발급 · 크레딧 충전 ($100)
- [x] `.env`에 실제 키 입력 → `/v1/models` 인증 성공 (126개 모델)
- [x] 모델 핀 고정 — `OPENAI_MODEL_TEXT=gpt-5.4-mini` · `OPENAI_MODEL_IMAGE=gpt-image-1`

**스파이크 결과** — 실제 스키마로 3개 모델 비교. 셋 다 strict JSON Schema를 지켰고 한국어 출력도 정상.

| 모델 | 지연 | 출력 토큰 | 비고 |
| --- | --- | --- | --- |
| `gpt-4.1-mini` | 5.4초 | 358 | 설명이 일반적 |
| `gpt-5.4` | 10.9초 | 649 | 가장 구체적, 느림 |
| **`gpt-5.4-mini`** | **4.5초** | 490 | 채택 — 구체적이면서 가장 빠름 |

- 결과 생성 스키마(중첩 배열 2개 포함)까지 통과. `categoryChanges` 3건도 SKIN·BODY·HEALTH로 정확히 나옴
- **P95 30초 목표에 여유가 크다.** 키워드 추출 + 결과 생성을 합쳐도 10초 안쪽
- 발견된 문제와 조치는 §0-5 참조

> `gpt-image-1`은 미검증이다. 이미지 생성은 이번 스프린트 범위 밖이라 나중에 확인한다.

### 0-2. ✅ 오브젝트 스토리지 — **완료 (8/14)**

**AWS S3 · 서울 리전(`ap-northeast-2`)** 채택. PRD §10의 국내 저장 요건을 만족한다.

- [x] 버킷 `gojeom-media-kr-1234` 생성 · 퍼블릭 액세스 전면 차단
- [x] IAM 사용자 `gojeom-backend` + 정책 `gojeom1-s3-access` (해당 버킷 객체 3개 액션만)
- [x] CORS 설정 (`PUT`·`GET`, origin `http://localhost:5173`)
- [x] `.env`의 `STORAGE_*` 5개 값 입력

**검증 결과** — SigV4로 실제 요청

| 항목 | 결과 |
| --- | --- |
| PUT / GET / DELETE | 200 / 200 / 204 |
| CORS 프리플라이트 | 200, `Allow-Origin` · `Allow-Methods` 정상 |

**겪은 문제 2가지 (재발 방지용 기록)**

1. 첫 버킷이 `us-east-1`에 생성됐다 — 콘솔 리전 선택기가 기본값이었다. S3는 생성 후 리전 변경이 불가하므로 **버킷 생성 전에 리전 선택기를 서울로 바꿔야 한다.**
2. IAM 정책을 **만들기만 하고 사용자에 연결하지 않아** `AccessDenied`가 났다. 오류 메시지 `no identity-based policy allows` 가 이 상황을 뜻한다.

> 프론트를 배포하면 그 주소를 CORS `AllowedOrigins`에 추가해야 한다.

### 0-3. 배포 환경

**서버는 가비아를 제공받았다.** 애플리케이션 서버는 가비아, 파일 저장만 AWS S3를 쓴다.

- [ ] 가비아 서버 사양·OS 확인 (Java 21 설치 가능 여부)
- [ ] PostgreSQL을 가비아 서버에 둘지, 별도로 둘지 결정
- [ ] 배포 주소 확정 → `CORS_ALLOWED_ORIGINS`와 **S3 버킷 CORS `AllowedOrigins`** 양쪽에 추가
- [ ] 서버 환경 변수 주입 방식 결정 (`.env`는 커밋되지 않으므로 별도 전달)

> **AWS에는 EC2·RDS를 만들지 않는다.** 서버가 이미 있으므로 AWS 사용은 S3 하나로 제한한다. 비용이 새는 지점을 원천 차단하는 효과가 있다.

### 0-4. ✅ 문서 선반영 — **완료 (8/14)**

- [x] `AUTH_EMAIL_DUPLICATED` (409, "이미 가입된 이메일이에요.") — API.md §4 · `ErrorCode` enum 양쪽 반영

### 0-6. 🔴 Google OAuth 클라이언트 발급 — 코딩 전에 미리

구현(2.5h)보다 **콘솔 설정에서 시간을 더 먹는다.** 금요일 코딩 전에 끝내둔다.

[Google Cloud Console](https://console.cloud.google.com) 에서:

- [ ] 프로젝트 생성 (예: `gojeom`)
- [ ] **OAuth 동의 화면** 구성 — User Type `외부`, 앱 이름·지원 이메일 입력
- [ ] 게시 상태는 **테스트**로 두고, **테스트 사용자에 팀원 이메일 추가**
      (테스트 모드에서는 등록된 계정만 로그인된다. 빠뜨리면 팀원이 못 쓴다)
- [ ] 범위(scope)는 `email` · `profile` · `openid` 3개면 충분
- [ ] **사용자 인증 정보 → OAuth 클라이언트 ID → 웹 애플리케이션**
- [ ] 승인된 JavaScript 원본: `http://localhost:5173` (배포 후 그 주소도 추가)
- [ ] 발급된 **클라이언트 ID**를 `.env`의 `GOOGLE_CLIENT_ID`에 입력

**클라이언트 ID는 프론트와 백엔드가 함께 쓴다.** 프론트는 로그인 버튼에, 백엔드는 ID 토큰 검증의 `audience`로 쓴다. 클라이언트 시크릿은 이 방식에서 **필요 없다.**

**결정할 것 하나** — 이메일로 가입한 계정과 같은 이메일로 Google 로그인하면?

> 현재 방침: **같은 계정으로 로그인시킨다.** `users.email`이 유일 키이므로 이메일 기준 1계정이다.
> 단 Google로 먼저 가입하면 `password_hash`가 NULL이라 이메일 로그인은 불가하다.
> 비밀번호 설정 기능은 이번 범위 밖이다.

### 0-5. ✅ 키워드 카테고리 FACE 추가 — **완료 (8/13)**

스파이크에서 발견한 실제 문제. `"차분한 인상"`·`"또렷한 인상"` 같은 얼굴 관련 키워드가 3종(SKIN/BODY/HEALTH) 강제 탓에 **`HEALTH`로 오분류**됐다. Figma 시안의 실제 키워드(`다이아몬드형`·`귀족턱`·`큰 눈`)도 대부분 얼굴 관련이라 같은 문제가 난다.

- [x] `V2__keyword_category_face.sql` — `analysis_keywords.category` CHECK를 4종으로 확장 (적용·검증 완료)
- [x] `KeywordCategory` enum 신설 (4종) — `Category`(3종)와 분리
- [x] API.md · ERD.md 반영

**키워드만 4종이다.** `profiles.priorities` · `routines.category` · `routine_tasks.category` · `categoryChanges`는 3종 그대로다. 우선순위와 루틴에는 얼굴형이 없기 때문이다.

> 구현 시 `Category`에 `FACE`를 추가하고 싶어질 수 있는데, 그러면 우선순위에 얼굴형이 들어가 시안(06 우선 순위 등록)과 어긋난다. 두 enum을 합치지 않는다.

---

## 금 (8/14) — 인증 · 프로필 · 스토리지

목표: **프론트가 회원가입 → 로그인 → 프로필 등록까지 실제 API로 수행할 수 있다.**

> **D1-1 ~ D1-5 완료 (8/14).** 회원가입·로그인·토큰갱신·`/users/me` 전 흐름을 실제 DB로 검증했다. 검증 결과는 이 절 끝의 «D1 검증» 참조.

### D1-1. ✅ 공통 엔티티 기반 — 완료

- [x] `common/entity/BaseCreatedEntity` — `created_at`만 있는 테이블용
- [x] `common/entity/BaseTimeEntity` — `created_at` + `updated_at`

**겪은 문제** — Spring Data Auditing의 기본 `DateTimeProvider`는 `LocalDateTime`을 공급해 `OffsetDateTime` 필드에 넣지 못한다. `JpaConfig`에 UTC `OffsetDateTime`을 공급하는 provider를 등록해 해결했다. 이걸로 "UTC 저장 / KST 표시" 규칙이 코드에 못박혔다.

> ⚠️ **`ddl-auto: validate`이므로 엔티티가 스키마와 정확히 일치해야 앱이 뜬다.** 컬럼명·타입이 하나라도 어긋나면 기동 실패한다. JSONB 컬럼은 반드시 `@JdbcTypeCode(SqlTypes.JSON)`을 붙인다.

### D1-2. ✅ JWT 인증 — 완료

- [x] `common/security/UserPrincipal`
- [x] `auth/jwt/JwtProvider` — access 30분 / refresh 14일, `typ` 클레임으로 종류 구분
- [x] `auth/jwt/JwtAuthenticationFilter`
- [x] `SecurityConfig`에 필터 결선 (TODO 제거)

`@AuthenticationPrincipal UserPrincipal`을 그대로 쓰면 되어 별도 애노테이션은 만들지 않았다.

**`typ` 클레임을 둔 이유** — refresh 토큰으로 API를 호출하거나 access 토큰으로 갱신을 시도하는 것을 막는다. 실제로 검증에서 access 토큰으로 refresh를 시도하면 401이 나오는 것을 확인했다.

### D1-3. ✅ user 도메인 — 완료

- [x] `user/entity/User` — 정적 팩터리 `ofLocal` / `ofGoogle`
- [x] `user/repository/UserRepository` — soft delete 제외 조회 4종
- [x] `subscription/entity/Subscription` + repository
- [x] `SubscriptionRepository.consumeCredit` — **단일 UPDATE 차감** (D2-6에서 사용)

### D1-4. ✅ auth 엔드포인트 — 완료

- [x] `AuthDtos` — Signup / Login / Refresh / TokenResponse / UserSummary
- [x] `AuthController` — signup · login · refresh · logout
- [x] `AuthService` — BCrypt, 중복 시 `AUTH_EMAIL_DUPLICATED`
- [x] 가입 시 `Subscription(TRIAL, 1회, +1개월)` 생성 — 같은 트랜잭션
- [x] **이메일 소문자 정규화** — 대소문자만 다른 중복 가입 차단

로그아웃은 무상태라 서버가 폐기할 토큰이 없다. 토큰 블랙리스트는 범위 밖이며 엔드포인트만 열어뒀다.

### D1-5. ✅ GET /users/me — 완료

- [x] `UserController` + `UserService` + `MeResponse`
- [x] `analysisCredits` · `subscription`(canAnalyze / canCreateRoutine) 포함
- [ ] `hasProfile` — **현재 항상 `false`.** 프로필 도메인(D1-7)이 붙으면 실제 조회로 교체한다

> `hasProfile`은 프론트의 최초 진입 라우팅 기준이다. D1-7 완료 시 반드시 실제 값으로 바꿔야 한다. ([API.md](../API.md) C-1)

### D1-6. storage presigned (2h)

- [ ] `storage/ObjectKeyFactory` — `profiles/{userId}/{uuid}.{ext}` 등 4종 규칙
- [ ] `storage/StorageService` — `S3Presigner`로 PUT 5분 / GET 10분 URL 발급
- [ ] `storage/UploadController` — `POST /uploads/presigned`
- [ ] `contentLength > 10MB` → `FILE_TOO_LARGE`
- [ ] **발급된 key가 요청자 소유 경로인지 검증하는 유틸** (저장 시점에 재확인)

**완료 판정** — 발급받은 URL로 실제 파일 PUT 성공, GET URL로 조회 성공

### D1-7. profile 도메인 (2.5h)

- [ ] `profile/entity/Profile` — JSONB 3개(`priorities`·`inbody`·`analysisSummary`)에 `@JdbcTypeCode(SqlTypes.JSON)`
- [ ] `profile/dto/ProfileCreateRequest` + **`priorities` 커스텀 검증** (길이 3 · 중복 없음 · `SKIN`/`BODY`/`HEALTH`)
- [ ] `profile/ProfileController` — `POST /profiles` · `GET /profiles/me`
- [ ] `POST`: photoKey 소유 검증 → 기존 active 프로필 비활성화 → 새 행 생성
- [ ] `GET`: `photoUrl`을 presigned GET URL로 발급

**이 시점의 `analysisSummary`는 `null`이다.** AI 연동이 D2-2에서 붙는다. 가짜 값을 넣지 않는다. 프론트에 "아직 null로 내려간다"고 공유한다.

### D1-8. 🔴 AI 스파이크 (2h) — 저녁

**토요일 전체가 여기 걸려 있다. 반드시 오늘 확인한다.**

- [ ] `ai/OpenAiClient` 최소 구현 (RestClient, 타임아웃 60초)
- [ ] 키워드 추출 스키마로 **실제 호출 1회 성공**
- [ ] 확인: `json_schema` strict가 지켜지는가 / 한국어 출력 품질 / **응답 지연 몇 초인가**
- [ ] 실패 시 → 스키마 단순화 → 모델 변경 순으로 대응. 대안은 [PLAN.md](PLAN.md) §6

### D1 검증 (8/14)

로컬 PostgreSQL 18.4 · 실제 HTTP 요청으로 12개 시나리오 확인.

| # | 시나리오 | 결과 |
| --- | --- | --- |
| 1 | 회원가입 | 201, TRIAL 구독 동시 생성 |
| 2 | 이메일 중복 | 409 `AUTH_EMAIL_DUPLICATED` |
| 3 | 대소문자만 다른 이메일 | 409 (정규화 동작) |
| 4 | 로그인 | 200 |
| 5 | 비밀번호 오류 | 401 `AUTH_INVALID_CREDENTIALS` |
| 6 | `GET /users/me` | 200, credits=1 · TRIAL/ACTIVE · canAnalyze=true |
| 7 | 토큰 없음 | 401 |
| 8 | 위조 토큰 | 401 |
| 9 | 토큰 갱신 | 200, 새 토큰 발급 |
| 10 | access 토큰으로 refresh | 401 `AUTH_TOKEN_EXPIRED` |
| 11 | 입력 검증 실패 | 400 `VALIDATION_ERROR` + 필드별 사유 |
| 12 | 깨진 JSON 본문 | 400 `VALIDATION_ERROR` |

**DB 확인** — 한글 닉네임 정상 저장, BCrypt 해시 60자, `users=1 subscriptions=1`(트랜잭션 정합성).

**추가로 고친 것** — 12번 시나리오에서 깨진 JSON이 **500으로 나가는 결함**을 발견해 `HttpMessageNotReadableException` 핸들러를 추가했다. 클라이언트 잘못을 서버 장애로 보이게 하는 문제였다.

**금요일 총 13h.** 많다. D1-8을 지키기 위해 D1-6·D1-7이 밀리면 토요일 오전으로 넘긴다.

---

## 토 (8/15) — 분석 파이프라인

목표: **고점 텍스트를 넣으면 키워드가 나오고, 고르면 결과가 완성된다.**

### D2-1. ai 모듈 정식화 (2.5h)

- [ ] `ai/OpenAiClient` — 429·5xx만 2회 재시도(지수 백오프), 4xx는 재시도 안 함
- [ ] `ai/schema/JsonSchemas` — [API.md](../API.md) §7.2~7.3 스키마 상수화
- [ ] `ai/prompt/SystemPrompts` — 가드레일 G-1~G-8 공통 블록
- [ ] `ai/prompt/KeywordExtractionPrompt` · `ResultGenerationPrompt`
- [ ] `ai/job/AiJob` 엔티티 + `AiJobRecorder` — stage·model·토큰·지연·에러코드 기록
- [ ] **프롬프트 원문과 사진을 저장하지 않는다** (PRD §9)

### D2-2. 프로필 분석 (1.5h) — 여유 없으면 일요일로

- [ ] `PROFILE_ANALYSIS` 단계 — 사진(presigned GET URL) + 신체정보 → `analysis_summary`
- [ ] 프로필 생성 후 비동기로 채움
- [ ] **점수·등급 필드를 만들지 않는다** (G-1)

### D2-3. analysis 엔티티 (1h)

- [ ] `Analysis` · `AnalysisReferenceImage` · `AnalysisKeyword` · `AnalysisResult` + repository 4종

### D2-4. 분석 생성 · 키워드 추출 (2.5h)

- [ ] `AnalysisController` — `POST /analyses` → **202**
- [ ] `AnalysisService` — 프로필 존재(`PROFILE_REQUIRED`) · 분석권(`NO_ANALYSIS_CREDIT`) 사전 검증
- [ ] **`AnalysisTxService`** — `@Transactional` 메서드만 가진 별도 빈 (상태 갱신 전용)
- [ ] `AnalysisPipeline` — `@Async("analysisExecutor")`, **OpenAI 호출은 트랜잭션 밖**
- [ ] `@TransactionalEventListener(AFTER_COMMIT)`로 비동기 시작
- [ ] 상태 전이 `CREATED → EXTRACTING → KEYWORDS_READY`

> 같은 클래스 내부 호출은 프록시를 안 타서 트랜잭션이 안 걸린다. **반드시 빈을 분리한다.**

### D2-5. 상태 폴링 (0.5h)

- [ ] `GET /analyses/{id}` — `status` · `imageStatus` · `progress` · `message` · `pollAfterMs`
- [ ] 상태별 `progress` 매핑 (EXTRACTING 0~50, GENERATING 50~99, DONE 100)

### D2-6. 키워드 선택 · 결과 생성 (2.5h)

- [ ] `GET /analyses/{id}/keywords` — `minSelect`·`maxSelect` 포함
- [ ] `POST /analyses/{id}/keywords/selection` — 상태 검증(`ANALYSIS_INVALID_STATE`), 1~4개
- [ ] `RESULT_GENERATION` → `AnalysisResult` 저장 → `DONE`
- [ ] **`categoryChanges` 3건이 SKIN·BODY·HEALTH 각 1건인지 검증**, 아니면 재생성
- [ ] **`profiles.priorities` 순서로 정렬**해 저장
- [ ] **분석권 차감** — 결과 저장과 같은 트랜잭션, 단일 UPDATE
- [ ] `GET /analyses/{id}/result` — `viewState=FRESH`, **`disclaimer` 항상 포함**
- [ ] 참고 사진 없으면 `imageStatus=SKIPPED`

### D2-7. 가드레일 · 실패 처리 (1.5h)

- [ ] `ai/guardrail/OutputValidator` — 점수 패턴(`\d+점`, `상위 \d+%`) · 금지어(`치료`·`시술받`·`진단`)
- [ ] 위반 시 1회 재생성, 재차 위반 시 `AI_PROVIDER_ERROR`
- [ ] `AnalysisSweeper` — `@Scheduled(fixedDelay=60s)`, 3분 초과 진행 건 `FAILED` 전환
- [ ] 실패 코드별 **분석권 미차감** 확인 (`ANALYSIS_TIMEOUT`·`CONTENT_POLICY_BLOCKED`)

**토요일 총 12h.** 가장 빡빡한 날이다. 밀리면 D2-2를 먼저 버린다.

---

## 일 (8/16) — 서랍 · 목표 · 마무리

목표: **데모 경로 E2E 통과.**

### D3-1. 서랍 (1.5h)

- [ ] `POST /analyses/{id}/result/save` — `SavedResult` 생성
- [ ] `GET /saved-results` — **3섹션**(`inProgress`·`recent`·`all`) 분류 쿼리
- [ ] `GET /saved-results/{id}` — 결과와 동일 스키마, `viewState=SAVED`
- [ ] 썸네일 없으면 `thumbnailUrl: null`

### D3-2. 목표 생성 경로 A (2h)

- [ ] `routine/entity/Routine` · `RoutineTask` + repository
- [ ] `ai/prompt/RoutineGenerationPrompt` + 스키마
- [ ] `POST /routines` — `sourceType=FROM_ANALYSIS`
- [ ] 태스크 `title` / `timing` / `durationLabel` / `amountLabel` 생성
- [ ] `source_type` CHECK 제약 만족 (analysis_result_id NOT NULL, category·duration NULL)

### D3-3. 목표 조회 · 완료 체크 (1.5h)

- [ ] `GET /routines/{id}` — `overview` + `tasks` + `progress`
- [ ] `PATCH /routine-tasks/{id}` — 완료 체크 + 진행률 재계산
- [ ] 소유권 검증

### D3-4. E2E 통과 (2h)

데모 경로를 **처음부터 끝까지 한 번에** 통과시킨다. 중간에 끊기면 그 지점을 고친다.

```text
회원가입 → 로그인 → presigned 업로드 → 프로필 등록
  → 고점 입력 → 폴링 → 키워드 선택 → 결과 확인
  → 서랍 저장 → 서랍 열람 → 목표 생성 → 태스크 완료 체크
```

### D3-5. 마무리 (2h)

- [ ] 모든 Service 진입부에 **소유권 검증** 누락 없는지 확인
- [ ] 에러 응답이 [API.md](../API.md) §4 코드·문구와 일치하는지 확인
- [ ] 로그에 사진 URL·프롬프트·토큰이 남지 않는지 확인
- [ ] **코드에 고정 응답·더미 데이터가 없는지 확인**
- [ ] 남는 시간 → `PATCH /profiles/me/priorities` · `DELETE /routines/{id}` · 알림 설정

### D3-6. Google 소셜 로그인 (2.5h) — **맨 마지막**

**위 작업이 전부 끝난 뒤에 한다.** 데모 경로는 이메일 로그인만으로 완성되므로, 이걸 먼저 하면 핵심 기능이 밀린다. 시간이 없으면 스프린트 이후로 넘긴다.

**미뤄도 재작업이 없다.** 스키마(`provider` · `provider_user_id` · nullable `password_hash`)와 API 계약이 이미 소셜 로그인을 수용하도록 설계되어 있다. 붙일 때 기존 코드를 고칠 필요가 없고, 새로 짜는 것은 검증기와 엔드포인트 하나뿐이다.

전제: **0-6 콘솔 설정 완료.** 이메일 로그인 코드를 재사용한다.

- [ ] `build.gradle`에 `com.google.api-client:google-api-client` 추가
- [ ] `auth/oauth/GoogleTokenVerifier` — `GoogleIdTokenVerifier`로 서명·issuer·audience·만료 검증
- [ ] `POST /auth/oauth/google` — body `{ "idToken": "..." }`
- [ ] `sub` → `provider_user_id`, `email`·`name` 추출
- [ ] **사용자 조회 순서: `(provider, providerUserId)` → 없으면 `email` → 없으면 신규 생성**
      두 번째 단계가 "같은 이메일이면 같은 계정" 방침을 구현한다
- [ ] 신규 생성 시 `provider=GOOGLE`, `passwordHash=null`, `Subscription(TRIAL)` 발급
- [ ] 응답은 이메일 로그인과 **동일한 `TokenResponse`** (프론트가 분기하지 않도록)

**완료 판정** — Google 계정으로 로그인해 받은 토큰으로 `GET /users/me` 200. 같은 이메일의 기존 계정이 있으면 새 계정이 생기지 않고 그 계정으로 로그인된다.

> ID 토큰 검증을 직접 구현하지 않는다. JWKS 캐싱·키 롤오버까지 라이브러리가 처리한다.

**일요일 총 11.5h** (Google 로그인 2.5h 포함. 빼면 9h).

---

## 완료 기준

일요일 밤에 전부 참이어야 한다.

- [ ] 데모 경로 E2E 통과
- [ ] 결과 응답에 `disclaimer` 항상 포함
- [ ] 결과 어디에도 점수·등급·순위 표현 없음
- [ ] 실패 시 정확한 에러 코드와 한국어 문구
- [ ] 고정 응답·더미 데이터·fixture 없음
- [ ] 열려 있는 모든 엔드포인트가 실제 DB·실제 AI로 동작

---

## 시간 총계와 현실

| 날 | 예상 |
| --- | --- |
| 금 | 13h |
| 토 | 12h |
| 일 | 11.5h |
| **합계** | **36.5h** |

3일에 36시간은 빡빡하다. 밀릴 때 버리는 순서를 미리 정해둔다.

1. **D2-2 프로필 분석** — 결과 생성이 프로필 원본 데이터만으로도 가능하다
2. **D3-5 남는 시간 작업** — 부가 엔드포인트
3. **D3-0 Google 로그인** — 이메일 로그인이 있으므로 데모는 가능하다
4. **D3-2·D3-3 목표 생성** — 데모를 결과 화면까지로 축소

> D1-8(AI 스파이크)을 8/13에 미리 끝냈으므로 금요일은 실질 11h다.

**절대 버리지 않는 것** — D1-2 인증 · D1-7 프로필 · D2-4~D2-6 분석 파이프라인. 이게 서비스의 전부다.
