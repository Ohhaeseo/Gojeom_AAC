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

### 0-2. 오브젝트 스토리지 결정 — 없으면 사진 업로드가 안 된다

프로필 사진과 고점 참고 사진이 전부 여기 올라간다. **더미로 대체할 수 없는 항목이다.**

| 선택지 | 장단점 |
| --- | --- |
| **AWS S3** (서울 리전) | 가장 확실. 계정·결제 필요. 프리티어로 충분 |
| **NCP Object Storage** | 국내 리전. PRD §10의 국내 저장 요건에 맞음 |
| **MinIO 로컬 실행** | 무료·즉시. `minio.exe` 단일 실행 파일이라 관리자 권한 불필요. 단 배포 시 교체 필요 |

- [ ] 하나 선택하고 버킷 생성
- [ ] `.env`의 `STORAGE_*` 4개 값 입력
- [ ] CORS 설정 (프론트가 브라우저에서 직접 PUT 하므로 필수)

> 개발만 빠르게 하려면 MinIO, 그대로 배포까지 갈 거면 S3/NCP를 권한다.

### 0-3. 배포 환경 결정

- [ ] 프론트가 붙을 주소를 정한다 (로컬 공유 / 클라우드 배포)
- [ ] 로컬만 쓸 경우 같은 네트워크에서 접근 가능한지 확인
- [ ] `CORS_ALLOWED_ORIGINS`에 프론트 주소 추가

### 0-4. 문서 선반영 (30분)

구현하다 보면 [API.md](../API.md)에 없는 것이 나온다. **문서를 먼저 고친다.**

- [ ] `AUTH_EMAIL_DUPLICATED` (409) 에러 코드 추가 — 회원가입 이메일 중복. 현재 API.md에 없다
- [ ] `ErrorCode` enum에도 동일하게 추가

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

### D1-1. 공통 엔티티 기반 (0.5h)

- [ ] `common/entity/BaseTimeEntity` — `@MappedSuperclass`, `createdAt`/`updatedAt`, `@EntityListeners(AuditingEntityListener.class)`

> ⚠️ **`ddl-auto: validate`이므로 엔티티가 스키마와 정확히 일치해야 앱이 뜬다.** 컬럼명·타입이 하나라도 어긋나면 기동 실패한다. JSONB 컬럼은 반드시 `@JdbcTypeCode(SqlTypes.JSON)`을 붙인다.

### D1-2. JWT 인증 (2.5h)

- [ ] `common/security/UserPrincipal` — `record(UUID userId, String email)`
- [ ] `auth/jwt/JwtProvider` — access 발급 / refresh 발급 / 파싱 / 검증
- [ ] `auth/jwt/JwtAuthenticationFilter` — `OncePerRequestFilter`, `SecurityContext`에 주입
- [ ] `SecurityConfig`에 필터 결선 — **현재 TODO 주석 제거**
- [ ] `common/security/CurrentUser` — `@AuthenticationPrincipal` 래핑 애노테이션

**완료 판정**
- 유효 토큰 → 보호된 경로 200
- 만료 토큰 → `401 AUTH_TOKEN_EXPIRED`, 응답이 `{success:false, error:{...}}` 봉투
- 토큰 없음 → 401

### D1-3. user 도메인 (1h)

- [ ] `user/entity/User` — email unique, passwordHash, provider, nickname, deletedAt
- [ ] `user/repository/UserRepository` — `findByEmailAndDeletedAtIsNull`
- [ ] `subscription/entity/Subscription` + repository (가입 시 필요)

### D1-4. auth 엔드포인트 (2h)

- [ ] `auth/dto/` — `SignupRequest`(email·password·nickname, `@Valid`), `LoginRequest`, `TokenResponse`
- [ ] `auth/AuthController` — `POST /auth/signup` · `/login` · `/refresh` · `/logout`
- [ ] `auth/AuthService` — BCrypt 해싱, 중복 이메일 → `AUTH_EMAIL_DUPLICATED`
- [ ] **가입 시 `Subscription(TRIAL, analysisCredits=1, expiresAt=+1개월)` 생성** — 같은 트랜잭션

**완료 판정** — 가입 → 로그인 → 받은 토큰으로 `GET /users/me` 200

### D1-5. GET /users/me (0.5h)

- [ ] `user/UserController` + `UserService`
- [ ] `hasProfile` — `profiles`에 `is_active=true` 행 존재 여부
- [ ] `analysisCredits` · `subscription` 포함

> 프론트의 라우팅 분기 기준이라 정확해야 한다. ([API.md](../API.md) C-1)

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

**일요일 총 9h.**

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
| 일 | 9h |
| **합계** | **34h** |

3일에 34시간은 빡빡하다. 밀릴 때 버리는 순서를 미리 정해둔다.

1. **D2-2 프로필 분석** — 결과 생성이 프로필 원본 데이터만으로도 가능하다
2. **D3-5 남는 시간 작업** — 부가 엔드포인트
3. **D3-2·D3-3 목표 생성** — 데모를 결과 화면까지로 축소

**절대 버리지 않는 것** — D1-2 인증 · D1-7 프로필 · D2-4~D2-6 분석 파이프라인. 이게 서비스의 전부다.
