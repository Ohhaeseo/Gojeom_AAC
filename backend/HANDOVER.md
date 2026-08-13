# 인수인계 — 2026-08-14 (금) 작업 종료 시점

다음 세션에서 **D2 분석 파이프라인**을 이어받는 사람을 위한 문서.

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
| PRD O-2 | 개인정보 동의 화면·생년월일 미설계. 만 14세 확인 불가 | 법적 요구사항 |
| PRD O-3 | 구독·결제 화면 미설계 | 스프린트 범위 밖 |
| PRD O-4 | 목표 생성 2경로 화면 미설계 | API·스키마는 준비됨 |
| 0-3 | 가비아 서버 배포 미착수 | 로컬 개발에는 지장 없음 |
| 0-6 | Google OAuth 콘솔 설정 미완 | D3-6 전까지만 하면 됨 |
| — | Testcontainers 테스트 미실행 | Docker 설치 후 |
