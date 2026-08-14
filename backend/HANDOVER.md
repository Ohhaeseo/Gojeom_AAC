# 인수인계 — 2026-08-14 (금) 작업 종료 시점

다음 세션에서 **D3-5 마무리 · D3-6 Google 로그인**을 이어받는 사람을 위한 문서.

> **D2 분석 파이프라인 · D3-1~D3-4 서랍·목표까지 완료됐다 (8/14).**
> 데모 경로 E2E가 실제 DB·S3·OpenAI로 통과한다 (D2 51건 + D3 78건).
> 아래 §1·§5는 D2 시작 시점 기준으로 쓰였다. **현재 상태는 §8을 본다.**
> 상세는 [TASKS.md](TASKS.md) «D2 검증»·«D3 검증», 물린 문제는 [AGENTS.md](../AGENTS.md) §4-1.

**먼저 읽을 것** — [AGENTS.md](../AGENTS.md) → [TASKS.md](TASKS.md) → [ARCHITECTURE.md](ARCHITECTURE.md) §5·§6

---

## 1. 지금 어디까지 왔나

### 동작하는 것 (실제 DB·S3·OpenAI로 검증됨)

| 영역 | 상태 |
| --- | --- |
| 프로젝트 골격 | Spring Boot 3.3.5 · Java 21 · Gradle Wrapper 포함 |
| DB | 로컬 PostgreSQL 18.4, Flyway **v1 → v2 → v3** 적용됨 |
| 공통 계층 | `ApiResponse` 봉투 · `ErrorCode` 21종 · `GlobalExceptionHandler` |
| 인증 | 회원가입 · 로그인 · 토큰갱신 · JWT 필터 (12개 시나리오 검증) |
| 스토리지 | presigned PUT/GET, 소유권 검증, 실제 S3 업로드·삭제 확인 |
| 프로필 | 등록 · 조회 · 수정 · 우선순위 변경 · 사진 삭제 |
| AI 연결 | OpenAI 키 유효, `gpt-5.4-mini` 핀 고정, 스키마 통과 확인 |

### 아직 없는 것

**D2 전체** — `ai` 모듈, `analysis` 도메인, 키워드 추출, 결과 생성, 가드레일.
그 뒤로 D3(서랍·목표·Google 로그인).

### 의도적으로 비워둔 자리

| 위치 | 상태 | 언제 채우나 |
| --- | --- | --- |
| `Profile.analysisSummary` | 항상 `null` | **D2-2** — 프로필 AI 분석 |
| `analysis_*` 테이블 | 스키마만 존재, 코드 없음 | D2-3 |

> 가짜 값을 넣지 않았다. 미구현은 미구현으로 두는 것이 이 프로젝트의 규칙이다.
> ([AGENTS.md](../AGENTS.md) 규칙 15)

---

## 2. 개발 환경 — 이미 다 준비되어 있다

`backend/.env`에 실제 값이 채워져 있다. **gitignore 대상이라 저장소에는 없다.**

| 항목 | 상태 |
| --- | --- |
| PostgreSQL | 로컬 18.4, DB·사용자 `gojeom` |
| AWS S3 | `gojeom-media-kr-1234` (서울), IAM 최소 권한, CORS 설정됨 |
| OpenAI | 키 유효, 크레딧 $100, `OPENAI_MODEL_TEXT=gpt-5.4-mini` |
| Gradle | Wrapper 포함. 별도 설치 불필요 |

### 실행

```bash
cd backend && SPRING_PROFILES_ACTIVE=local ./gradlew bootRun
```

`.env`는 자동으로 읽히지 않는다. 셸에 환경 변수로 주입하거나 IDE 실행 구성에 넣어야 한다.

### 이 환경에 없는 것

- **Docker 없음** → `./gradlew test`(Testcontainers)를 실행할 수 없다. 검증은 앱을 띄우고 실제 HTTP 호출로 한다.
- **관리자 권한 없음** → Docker Desktop 설치 불가

---

## 3. 확립된 구현 규칙 — 이대로 이어갈 것

D1에서 자리잡은 패턴이다. D2도 같은 방식으로 쓴다.

| # | 규칙 |
| --- | --- |
| 1 | 컨트롤러는 `ApiResponse.ok(...)`를 반환한다. 봉투를 직접 만들지 않는다 |
| 2 | 실패는 `BusinessException(ErrorCode.XXX)`. 문구는 enum이 소유한다 |
| 3 | 엔티티는 `private` 생성자 + 정적 팩터리. setter를 만들지 않는다 |
| 4 | 시간은 `OffsetDateTime`, UTC로 저장. Auditing은 `JpaConfig`의 provider가 공급 |
| 5 | JSONB 필드는 `@JdbcTypeCode(SqlTypes.JSON)` + 레코드 타입 |
| 6 | 소유권 검증은 Service 진입부에서. 남의 것은 `403 FORBIDDEN_RESOURCE` |
| 7 | 스키마 변경은 **새 마이그레이션 파일**로. V1을 고치지 않는다 |
| 8 | 컨트롤러에서 `@AuthenticationPrincipal UserPrincipal me`로 사용자를 받는다 |

---

## 4. 이미 물린 함정 — 다시 밟지 말 것

D1에서 실제로 시간을 쓴 문제들이다.

**① `ddl-auto: validate`라 엔티티가 스키마와 정확히 일치해야 앱이 뜬다.**
컬럼명·타입이 하나만 어긋나도 기동 실패한다. 새 엔티티를 만들면 바로 `bootRun`으로 확인하는 게 빠르다.

**② Spring Data Auditing의 기본 provider는 `LocalDateTime`을 공급한다.**
`OffsetDateTime` 필드에 못 넣어 500이 난다. `JpaConfig`에 UTC provider를 등록해 해결해 뒀다. **건드리지 말 것.**

**③ Jackson이 파생 메서드를 JSON 속성으로 본다.**
`Inbody.isEmpty()`가 JSONB에 `"empty": false`로 저장됐다. 레코드에 `isXxx()` / `getXxx()`를 추가하면 `@JsonIgnore`를 반드시 붙인다. **D2의 결과 레코드에서 재발하기 쉽다.**

**④ 문서와 스키마가 어긋나 있을 수 있다.**
`photo_key`가 `NOT NULL`이라 사진 삭제가 500이 났다. PRD·ERD는 NULL을 규정했는데 V1 DDL이 달랐다. **구현 전에 실제 DDL을 확인할 것.**

**⑤ S3 삭제 판정.**
최소 권한 정책이라 `ListBucket`이 없다. 없는 객체에 S3는 **404가 아니라 403**을 반환한다. `200 → 403` 전이가 삭제 확인이다.

**⑥ 텍스트 파일을 PowerShell로 조작하지 말 것.**
`Get-Content -Raw` + `Set-Content`로 한글 문서 인코딩을 깨뜨렸다. Edit 도구를 쓴다.

---

## 5. 다음 작업 — D2 분석 파이프라인

[TASKS.md](TASKS.md)의 D2-1 ~ D2-7이 정본이다. 그중 **놓치면 크게 돌아가는 것**만 추린다.

### 트랜잭션 경계 (가장 중요)

OpenAI 호출은 4~11초 걸린다. **트랜잭션 안에서 호출하면 커넥션 풀이 마른다.**

```text
AnalysisPipeline  (@Async, 트랜잭션 없음)
   ├─ analysisTx.markExtracting(id)      ← 짧은 트랜잭션
   ├─ openAiClient.extractKeywords(...)  ← 트랜잭션 밖
   └─ analysisTx.saveKeywords(id, ...)   ← 짧은 트랜잭션
```

- `@Transactional` 메서드만 가진 **별도 빈**(`AnalysisTxService`)으로 분리한다.
  같은 클래스 내부 호출은 프록시를 안 타서 트랜잭션이 안 걸린다.
- `@Async` 시작은 `@TransactionalEventListener(AFTER_COMMIT)`로 건다.
  커밋 전에 시작하면 비동기 스레드가 아직 없는 행을 조회한다.
- 스레드 풀은 `AsyncConfig`에 이미 있다 — `analysisExecutor` / `imageExecutor`.

### 이미 준비된 것을 쓸 것

| 필요한 것 | 이미 있는 것 |
| --- | --- |
| 분석권 차감 | `SubscriptionRepository.consumeCredit()` — 단일 UPDATE, 반환 0이면 잔여 없음 |
| 분석 가능 판정 | `Subscription.canAnalyze(now)` |
| 사진 URL | `StorageService.presignDownload(key)` — OpenAI에 넘길 때 사용 |
| 참고 사진 소유 검증 | `ObjectKeyFactory.assertOwned(key, REFERENCE_IMAGE, userId)` |
| 우선순위 | `Profile.getPriorities()` — **배열 순서가 곧 순위** |

### 스키마 주의

- `analysis_keywords.category`는 **4종**(`SKIN`·`FACE`·`BODY`·`HEALTH`) — `KeywordCategory` enum
- `category_changes`·`priorities`·`routines.category`는 **3종** — `Category` enum
- **두 enum을 합치지 말 것.** 우선순위와 루틴에는 얼굴형이 없다.

### AI 스파이크에서 확인된 사실

- `gpt-5.4-mini`로 결과 생성 스키마(중첩 배열 2개) 통과, **4.5초**
- P95 30초 목표에 여유가 크다
- 키워드 추출 + 결과 생성을 합쳐도 10초 안쪽

---

## 6. 저장소 상태

| 항목 | 값 |
| --- | --- |
| 원격 | https://github.com/Ohhaeseo/Gojeom_AAC |
| 기본 브랜치 | `codex/readme` (⚠️ `main`이 아니다) |
| 작업 브랜치 | `frontend` · `backend` — 셋 다 같은 커밋으로 동기화 중 |
| 시안 | 저장소에 없음. [Figma](https://www.figma.com/design/8AX19ImZG4ou6jqCwU0tPJ/GO.) 참조 |

커밋·푸시는 **사용자가 요청할 때만** 한다.

---

## 7. 미해결로 남은 것

| # | 내용 | 성격 |
| --- | --- | --- |
| PRD O-1 | 홈 화면 수치 대시보드가 서비스 원칙(G-1)과 충돌 | **팀 결정 필요.** 임의로 정하지 말 것 |
| A-7 | 결과 `overview.keywords`가 선택 키워드만 담는지 전체 후보를 담는지 | API.md 예시대로 **선택분만** 구현. FRESH 상태에서 칩을 조정하려면 전체가 필요할 수 있다 |
| A-8 | `imageStatus`가 항상 `SKIPPED` | 이미지 생성 단계가 붙을 때까지. §8-3 참조 |
| PRD O-2 | 개인정보 동의 화면·생년월일 미설계. 만 14세 확인 불가 | 법적 요구사항 |
| PRD O-3 | 구독·결제 화면 미설계 | 스프린트 범위 밖 |
| PRD O-4 | 목표 생성 2경로 화면 미설계 | API·스키마는 준비됨 |
| 0-3 | 가비아 서버 배포 미착수 | 로컬 개발에는 지장 없음 |
| 0-6 | Google OAuth 콘솔 설정 미완 | D3-6 전까지만 하면 됨 |
| — | Testcontainers 테스트 미실행 | Docker 설치 후 → `./gradlew integrationTest` |

---

## 8. D2 · D3 완료 이후 상태 〔2026-08-14 갱신〕

### 8-1. 이제 동작하는 것

| 영역 | 상태 |
| --- | --- |
| `ai` 모듈 | `OpenAiClient`(재시도·타임아웃) · `JsonSchemas` 5종 · 프롬프트 4종 · `AiJobRecorder` |
| 가드레일 | `OutputValidator` + **1회 재생성** · `TruncationDetector` · 단위 테스트 |
| 프로필 AI 분석 | `POST /profiles` 커밋 후 비동기로 `analysis_summary` 채움 |
| 분석 파이프라인 | 생성 → 키워드 추출 → 선택 → 결과 생성 → 분석권 차감 → `DONE` |
| 좀비 정리 | `AnalysisSweeper` 1분 주기. `KEYWORDS_READY`는 제외 |
| 서랍 | 저장 · 3섹션 목록 · 상세(`SAVED`) · 삭제 |
| 목표 | 생성 **경로 2종** · 목록 · 상세 · 삭제 · 태스크 완료 체크 |
| **인바디 OCR** | 서류 사진 → 6종 판독. 저장하지 않고 폼만 채운다 |
| **알림 설정** | 조회 · 변경 · 기기 토큰 등록 (발송은 수단 미정으로 없음) |
| **삭제** | 분석 전체 삭제 · 계정 삭제 (사진 즉시 하드 삭제) |
| **Google 로그인** | 코드 완성. **0-6 콘솔 설정 대기** — §8-5 |

**열려 있는 엔드포인트 (D1 제외)**

```text
POST   /auth/oauth/google                 Google 로그인 (0-6 대기)
DELETE /users/me                          계정 삭제 · 사진 즉시 삭제
POST   /profiles/inbody/scan              인바디 OCR (저장 안 함)
POST   /analyses                          202
GET    /analyses/{id}                     상태 폴링
GET    /analyses/{id}/keywords
POST   /analyses/{id}/keywords/selection  202
GET    /analyses/{id}/result              viewState=FRESH
POST   /analyses/{id}/result/save         서랍에 저장
DELETE /analyses                          내 분석 전체 삭제 (목표는 남는다)
GET    /saved-results                     3섹션
GET    /saved-results/{id}                viewState=SAVED
DELETE /saved-results/{id}                204
POST   /routines                          201 · sourceType 2종
GET    /routines
GET    /routines/{id}
DELETE /routines/{id}                     204
PATCH  /routine-tasks/{id}                완료 체크
GET    /notifications/settings
PATCH  /notifications/settings
POST   /notifications/device-tokens
```

**만들지 않은 것** — `/subscriptions/*`(구독·결제, **구현하지 않기로 결정**),
`/consents/terms`(동의 화면 미설계), 비교 이미지 생성.

**§1의 "의도적으로 비워둔 자리" 두 칸이 모두 채워졌다.** `Profile.analysisSummary`는 이제 AI가 채우고, `analysis_*` 테이블에는 코드가 붙었다.

**D2에서 남겨뒀던 `saved` 필드도 실제 조회로 교체됐다.** 서랍 테이블이 생겼기 때문이다.

### 8-2. 테스트 실행 방법이 바뀌었다

```bash
./gradlew test              # Docker 불필요. 단위 테스트 38건
./gradlew integrationTest   # Docker 필요. Testcontainers
```

§2의 "Docker가 없어 `./gradlew test`를 실행할 수 없다"는 **더 이상 사실이 아니다.**
통합 테스트만 분리됐다. ([AGENTS.md](../AGENTS.md) N-3)

### 8-3. 남은 작업에서 알아야 할 것

| # | 내용 |
| --- | --- |
| 1 | **`imageStatus`는 항상 `SKIPPED`다.** 이미지 생성이 범위 밖이라 `AnalysisPipeline.IMAGE_STATUS_UNTIL_IMAGE_STAGE_EXISTS` 상수로 고정해 뒀다. 붙일 때 이 상수를 지우고 참고 사진 유무로 분기한다. 서랍의 `thumbnailUrl`도 자동으로 채워진다 |
| 2 | **알림 설정 엔드포인트(`GET·PATCH /notifications/settings`)가 없다.** `notification_settings` 테이블은 이미 읽고 있으므로, 엔드포인트만 추가하면 목표 화면 토글이 그대로 살아난다. 조회 코드는 고칠 필요 없다 |
| 3 | **구독 만료 시 목표 생성을 막지 않는다.** 쓸 에러 코드가 없어서다 — §9-11 참조 |
| 4 | **새 AI 단계는 `AiTextService.generate`를 쓴다.** 가드레일 후검증 + 1회 재생성이 들어 있다. 새 스키마·프롬프트만 추가하면 된다 |
| 5 | **`~TxService` / 오케스트레이터 분리 구조를 따라간다.** 분석(`AnalysisTxService`)과 목표(`RoutineTxService`)가 같은 모양이다. AI 호출은 반드시 트랜잭션 밖 |
| 6 | **알림은 설정만 있고 발송이 없다.** 전송 수단(FCM vs Web Push)이 미정이라(B-5) `NotificationScheduler`를 만들지 않았다. 기기 토큰은 이미 쌓인다 |
| 7 | **`AccountPurger`(30일 후 하드 삭제)가 없다.** 계정 삭제는 soft delete까지만 한다. 사진은 삭제 시점에 이미 지워지므로 개인정보 요구는 충족된다 |
| 8 | **인바디 서류 사진은 스토리지에 남는다.** DB에 key를 저장하지 않는 설계라(스캔 결과를 저장하지 않으므로) 나중에 지울 대상을 알 수 없다. 버킷 수명 주기 정책으로 자동 만료시키는 편이 맞다 |

### 8-5. Google 로그인 — 코드는 끝났고 콘솔 설정만 남았다

`.env`의 `GOOGLE_CLIENT_ID`에 **자리표시자**가 들어 있다(23자, `.apps.googleusercontent.com` 접미 없음). 실제 클라이언트 ID가 없으면 audience 검증을 할 수 없어 **성공 경로를 시험하지 못했다.**

- 지금 상태 — 기동 시 `GOOGLE_CLIENT_ID가 설정되지 않았다` 경고, 호출하면 `500 INTERNAL_ERROR`
- **설정 누락을 인증 실패로 위장하지 않는다.** `AUTH_INVALID_CREDENTIALS`를 주면 사용자가 자기 계정 문제로 오해한다
- **0-6을 끝내고 `.env`만 채우면 된다.** 코드 수정 없음

> 검증할 것 — Google 계정 로그인 → `GET /users/me` 200,
> 그리고 **같은 이메일로 이미 가입한 계정이 있을 때 새 계정이 생기지 않는지.**

### 8-4. D2에서 새로 물린 함정 — §4에 이어서

**⑦ strict 스키마의 `maxLength`는 문장을 중간에서 자른다.**
에러가 아니라 그 길이에서 끊긴 채 200으로 온다. 짧은 라벨 자리에는 프롬프트에 **글자 수를 숫자로** 적어야 한다. ([AGENTS.md](../AGENTS.md) N-1)

**⑧ `@Modifying(clearAutomatically = true)`는 영속성 컨텍스트를 비운다.**
분석권 차감이 그렇다. **차감 → 로드 → 저장** 순서를 지킨다. 엔티티를 먼저 로드하면 변경이 사라진다. (N-4)

**⑨ 전역 Jackson이 `non_null`이라 `null` 필드가 응답에서 사라진다.**
API.md가 `"failureCode": null`처럼 null을 명시한 자리는 `@JsonInclude(ALWAYS)`가 필요하다. **기존 `ProfileResponse.analysisSummary`도 같은 문제를 갖고 있다** — §9 참조.

**⑩ `java.time`의 기본 직렬화가 계약과 다르다.**
`LocalTime`이 `"21:00:00"`으로 나간다. API.md는 `"21:00"`이다. 값은 맞고 형식만 틀려 **기능 테스트로는 안 잡힌다.** ([AGENTS.md](../AGENTS.md) N-6)

**⑪ soft delete 테이블의 UNIQUE 제약은 범위를 좁혀야 한다.**
`users.email`이 전체 UNIQUE라 탈퇴한 이메일로 재가입하면 500이 났다. 앱의 중복 검사는 `deleted_at IS NULL`인데 인덱스는 전체 행을 봤다. `V5`에서 부분 유니크 인덱스로 맞췄다. (N-8)

---

## 9. D2 검증 중 발견한, 아직 손대지 않은 문서·코드 불일치

에이전트가 임의로 고치지 않고 남겨 둔 것들이다. **팀 확인 후 반영한다.**

| # | 내용 | 어디 |
| --- | --- | --- |
| 1 | `POST /analyses` 요청에 `retriedFrom`이 없다. 그런데 "서버가 `retriedFrom`을 기록한다"고 적혀 있다. 클라이언트가 알려주지 않으면 서버가 알 방법이 없어 **선택 필드로 추가해 구현**했다 | API.md §6.4 |
| 2 | `referenceImageKeys`에 개수 상한이 없다. **서버가 5장으로 제한**했다 | API.md §6.4 |
| 3 | `profile_analysis` JSON Schema가 문서에 없다. ERD §5.3에서 역으로 만들어 구현했다 | API.md §7.2~7.4 |
| 4 | 금지어가 API.md는 3개(`치료`·`시술받`·`진단`), ARCHITECTURE는 4개(`처방` 포함). **넓은 쪽(4개)을 택했다** | API.md §7.5 |
| 5 | `ProfileResponse.analysisSummary`가 null일 때 응답에서 **키 자체가 사라진다**(전역 `non_null`). API.md는 `"analysisSummary": null`로 적고 있다 | API.md §6.3 |
| 6 | 결과 `overview.keywords`가 선택분만인지 전체 후보인지 모호하다. 예시대로 **선택분만** 구현했다 | API.md §6.4 |
| 7 | `analysis_results.comparison_image_key`는 컬럼 1개인데 응답은 `currentUrl`·`peakUrl` 2장이다. 이미지 생성을 붙일 때 정리가 필요하다 | ERD §3.7 · API.md §6.4 |
| 8 | ERD §6에 실린 `V1__init.sql` 전문에 `profiles.updated_at`이 빠져 있다. 실제 파일에는 있다 | ERD.md §6 |
| 9 | `.env.example` 상단 주석의 한글이 깨져 있다 (mojibake). §4-⑥과 같은 뿌리 | backend/.env.example |
| 10 | 사진 없는 프로필로 분석을 시도할 때 쓸 전용 에러 코드가 없다. `PROFILE_REQUIRED`로 대체했다 | API.md §4 |
| 11 | ~~구독 만료 시 목표 생성을 막을 에러 코드가 없다~~ → **해소됨. 비즈니스 모델은 구현하지 않기로 결정됐다** (2026-08-14). 만료 차단을 만들지 않으므로 새 에러 코드도 필요 없다. [AGENTS.md](../AGENTS.md) §4 참조 | — |
| 12 | **목표 생성이 `201` 동기인지 `202` 비동기인지 문서가 충돌한다.** API.md §6.6은 생성된 목표를 바로 담아 `201`, ARCHITECTURE.md A-2는 "AI 호출은 전부 비동기, 즉시 202". **계약 정본인 API.md를 따라 `201`로 구현**했다 (실측 2.2초) | API.md §6.6 ↔ ARCHITECTURE.md A-2 |
| 13 | **`GET /routines` 응답 모양이 정의되어 있지 않다.** §5 목록에만 있다. 새 계약을 만들지 않으려고 `POST /routines`의 항목 모양(`RoutineSummary`)을 그대로 재사용했다 | API.md §5 25번 |
| 14 | **목표 완주 시 `COMPLETED`로 전이하는 규칙이 문서에 없다.** 없으면 완주한 목표가 서랍의 "현재 진행중인 목표"에 영원히 남아 구현했다. 체크를 풀면 `ACTIVE`로 되돌린다 | ERD.md §3.8 |
| 15 | **`routine_tasks` 배치 주기가 미결(E-3)이다.** 경로 A는 `startDate` 하루, 경로 B는 주 단위 반복으로 해석했다. 두 문서의 예시 숫자(`total: 5` · `taskCount: 24`)를 모두 만족시키는 조합이다 | ERD.md E-3 · API.md §6.6 |
| 16 | **경로 A가 "서랍에 저장된 결과"만 허용하는지 불명확하다.** PRD F-09는 서랍에서 고른다고 하지만, 저장 여부를 강제하면 막을 이유 없는 흐름이 막힌다. **소유권만 검증**하고 저장 여부는 보지 않는다 | PRD F-09 · API.md §6.6 |
| 17 | **`*계정, 목표 정보는 삭제되지 않아요` 문구가 `DELETE /routines/{id}`에 붙어 있다.** 목표를 지우는 모달에서 "목표 정보는 삭제되지 않아요"는 말이 되지 않는다. **분석 전체 삭제 모달의 문구로 보고** 구현했다(분석을 지워도 목표는 남는다, V4). 문구 위치를 바로잡는 편이 좋다 | API.md §6.6 |
| 18 | **`ScanConfidence` 값이 정의되어 있지 않다.** API.md 예시에 `"HIGH"`만 있다. 6종 중 몇 개를 읽었는지로 서버가 판정한다 — 6개 `HIGH` / 3~5개 `MEDIUM` / 1~2개 `LOW`, 0개면 `422`. AI에게 자기 확신도를 묻지 않는다 | API.md §6.3 |
| 19 | **알림 응답이 API.md에서 봉투 없이 예시되어 있다.** §6.7만 `{ "enabled": ... }` 형태다. §1의 공통 봉투(`{success, data}`)를 따랐다 | API.md §6.7 |
| 20 | **인바디 서류 사진의 key를 DB에 남기지 않는다.** 스캔 결과를 저장하지 않는 설계의 부작용으로, 업로드된 서류가 스토리지에 영구히 남는다. 버킷 수명 주기 정책으로 자동 만료가 필요하다 | PRD §10 |
