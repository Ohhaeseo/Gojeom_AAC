# AGENTS.md

> AI 에이전트가 이 저장소에서 작업하기 전에 가장 먼저 읽는 파일.

**GO. (고점)** — 사용자의 사진·신체 정보와 원하는 **고점**을 AI로 비교 분석해, 변화 전략과 실행 가능한 목표를 제안하는 서비스. 멋쟁이사자처럼 대학 14기 해커톤 · 주제기업 AAC.

문서와 코드는 **한국어**로 쓴다.

---

## 1. 먼저 읽을 문서

작업 종류에 따라 아래를 먼저 읽는다. **추측하지 말고 해당 문서를 확인한다.**

| 작업 | 필독 |
| --- | --- |
| 무엇을 만드는지 | [PRD.md](PRD.md) |
| 화면·컴포넌트·색·간격 | [design.md](design.md) |
| API 요청/응답·Enum·에러 | [API.md](API.md) |
| DB 스키마 | [ERD.md](ERD.md) |
| 프론트 구조 | [frontend/ARCHITECTURE.md](frontend/ARCHITECTURE.md) |
| 백엔드 구조·비동기·AI 연동 | [backend/ARCHITECTURE.md](backend/ARCHITECTURE.md) |
| **백엔드 작업을 이어받을 때** | [backend/HANDOVER.md](backend/HANDOVER.md) → [backend/TASKS.md](backend/TASKS.md) |

**충돌 시 우선순위** — Figma 시안 > design.md > 나머지 문서.
시안과 문서가 다르면 문서를 고치고, 고친 이유를 남긴다.

> **시안은 저장소에 없다.** 저장소가 공개라 제외했다.
> [Figma 원본](https://www.figma.com/design/8AX19ImZG4ou6jqCwU0tPJ/GO.)을 보고,
> 로컬 참조가 필요하면 `assets/images/UI/`(gitignore 대상)에 PNG로 export 해둔다.

---

## 2. 파일 구조

```text
.
├─ AGENTS.md              이 파일
├─ README.md
├─ PRD.md                 제품 요구사항
├─ design.md              디자인 시스템
├─ API.md                 FE ⇄ BE 계약
├─ ERD.md                 데이터 모델
├─ assets/images/UI/      Figma export (원본 폭 458px) — 디자인 정본 · gitignore 대상
│
├─ frontend/              React · TypeScript · Vite
│  ├─ ARCHITECTURE.md
│  └─ src/
│     ├─ app/             라우터 · 프로바이더
│     ├─ pages/           라우트 = 시안 화면과 1:1
│     ├─ features/        도메인 로직 (auth · profile · analysis · drawer · routine)
│     └─ shared/          api · ui · layout · hooks · lib · styles
│
└─ backend/               Spring Boot 3.3 · Java 21 · Gradle
   ├─ ARCHITECTURE.md
   ├─ docker-compose.yml  로컬 PostgreSQL
   └─ src/main/
      ├─ java/com/gojeom/
      │  ├─ common/       응답 봉투 · 에러 코드 · 설정
      │  ├─ auth/ user/ profile/
      │  ├─ analysis/     ★ 고점 분석 파이프라인
      │  ├─ drawer/ routine/ notification/ subscription/
      │  ├─ ai/           ★ OpenAI 연동 · 프롬프트 · 가드레일
      │  └─ storage/      presigned URL
      └─ resources/db/migration/   Flyway
```

---

## 3. 필수 규칙

어기면 되돌리기 어렵거나 서비스 정체성이 깨지는 것들만 적었다.

### 도메인

| # | 규칙 |
| --- | --- |
| 1 | 사용자 대면 용어는 **"고점"**이다. "추구미"를 쓰지 않는다. |
| 2 | 카테고리는 **`SKIN` · `BODY` · `HEALTH` 3종**뿐이다. `FACE`는 없다 — 얼굴형은 키워드 라벨("다이아몬드형")로 다룬다. |
| 3 | `profiles.priorities`는 **배열 순서가 곧 1·2·3순위**다. 정렬을 바꾸지 않는다. |

### 서비스 원칙 (타협 불가)

| # | 규칙 |
| --- | --- |
| 4 | **외모를 점수·등급·순위로 표현하지 않는다.** "72점", "상위 20%" 같은 UI·문구·AI 출력 모두 금지. (PRD G-1) |
| 5 | **결과 화면의 면책 문구를 항상 노출한다.** 숨김·접기 금지. 이 문구가 없는 결과 화면은 배포할 수 없다. (PRD F-07) |
| 6 | 참고 이미지 속 **타인의 얼굴을 복제하지 않는다.** 분위기 요소만 적용한다. (PRD G-2) |

### 보안

| # | 규칙 |
| --- | --- |
| 7 | **저장소가 공개다.** 키·토큰·비밀번호를 커밋하지 않는다. 설정은 환경 변수로만 주입한다. |
| 8 | **OpenAI를 프론트에서 직접 호출하지 않는다.** 항상 백엔드를 경유한다. |
| 9 | 얼굴 사진은 생체정보에 준한다. 로그·에러 리포팅에 이미지 URL이나 key를 남기지 않는다. |

### 구현

| # | 규칙 |
| --- | --- |
| 10 | **이미지 바이트가 API 서버나 DB를 통과하지 않는다.** presigned URL로 클라이언트가 스토리지와 직접 주고받고, DB에는 key만 저장한다. |
| 11 | **스키마는 Flyway가 소유한다.** `ddl-auto`는 `validate`. 엔티티를 바꾸면 마이그레이션을 함께 추가한다. |
| 12 | **OpenAI 모델 ID를 코드에 하드코딩하지 않는다.** `application.yml`에서 핀 고정한다. |
| 13 | AI 텍스트 출력은 **strict JSON Schema**로 받는다. 자유 서술을 정규식으로 파싱하지 않는다. |
| 14 | 가드레일은 프롬프트만으로 보장하지 않는다. **서버가 출력을 후검증**한다. (backend/ARCHITECTURE.md §6.3) |
| 15 | **목데이터·가짜 응답을 만들지 않는다.** 하드코딩한 고정 응답, 더미 데이터, AI 호출을 대체하는 fixture 모두 금지. 실제로 동작하지 않으면 **범위를 줄이되, 만든 부분은 진짜로 동작해야 한다.** 미구현은 목업으로 덮지 말고 미구현으로 둔다. |

---

## 4. 미결 사항은 임의로 정하지 않는다

각 문서 마지막 절에 「미결 사항」이 있다. 여기 적힌 항목은 **팀의 결정이 필요한 것**이므로 에이전트가 임의로 확정하지 않는다. 관련 작업을 하게 되면 현재 상태대로 두고 사용자에게 확인한다.

특히 아래 둘은 제품 방향이 걸린 문제다.

- **PRD O-1** — 홈 화면의 수치 대시보드(피부 상태 %)가 위 규칙 4와 충돌한다. 정책 미결.
- **PRD O-2** — 개인정보 동의 화면과 생년월일 입력이 미설계다. 만 14세 확인은 법적 요구사항이다.

### 비즈니스 모델(구독·결제)은 구현하지 않는다 〔2026-08-14 팀 결정〕

**구독·결제·과금 게이팅을 코드로 만들지 않는다.** PRD §11과 F-12에 요금제가 적혀 있고 API.md §5에 엔드포인트 3개(33~35번)가 정의되어 있으나, **이번 범위에서 구현 대상이 아니다.** 관련 화면도 미설계다(PRD O-3).

| 항목 | 상태 |
| --- | --- |
| `GET /subscriptions/me` · `POST /subscriptions/checkout` · `POST /subscriptions/webhook` | **구현하지 않음** |
| `payments` 테이블 | 스키마만 존재. 코드 없음 |
| **구독 만료 시 신규 분석·목표 생성 차단** (PRD F-12) | **구현하지 않음** |
| 가입 시 `TRIAL` 구독 + 분석권 1회 발급 | 유지 (D1에서 구현됨) |
| 결과 생성 성공 시 분석권 1회 차감 | 유지 (D2에서 구현됨) |

**분석권 차감은 구독 기능이 아니라 분석 파이프라인의 일부**라 그대로 둔다. 차감·잔여 확인(`NO_ANALYSIS_CREDIT`)은 계속 동작한다.

> 만료 차단을 구현하지 않으므로 `SUBSCRIPTION_REQUIRED` 같은 새 에러 코드도 만들지 않는다. 결제가 스프린트 범위에 들어오면 그때 API.md §4에 함께 추가한다.

---

## 4-1. 오답 노트 — 실제로 물린 문제와 재발 방지 장치

> 여기 적힌 것은 전부 **이 저장소에서 실제로 발생한** 문제다.
> 각 항목에는 "무엇을 고쳤나"가 아니라 **"두 번 다시 안 나게 무엇을 걸어뒀나"** 를 적는다.
> 새로 물리면 같은 형식으로 추가한다.

### N-1. Structured Outputs의 `maxLength`는 문장을 중간에서 자른다 〔2026-08-14 · D2〕

**증상** — 결과지의 `emphasizePoints`에 이런 값이 저장됐다.

```text
"피부는 맑고 균일한 결로 정리하면 단정한 인상이 더 또"
"체수분 32.5L, 단백질 8.7kg, 무기질 3.1kg, 체지방 14.2kg, 골격근량 24.1kg,BMI"
```

**원인** — strict 스키마의 `maxLength`는 검증이 아니라 **디코딩 제약**이다. 위반하면 에러가 나는 게 아니라 **그 길이에서 그냥 끊긴 채 200으로 온다.** `keepPoints`·`emphasizePoints`·`changeIntensity`(30자)와 `analysis_summary`의 세 필드(30·40·60자)는 원래 **짧은 라벨** 자리인데(ERD.md §5.4 예시가 `["부드러운 얼굴선", "입매"]`), 프롬프트가 문장을 유도해 전부 잘렸다.

**재발 방지**

| 장치 | 위치 |
| --- | --- |
| 프롬프트가 "문장이 아니라 12자 이내 명사구"를 좋은 예/나쁜 예와 함께 요구 | `ResultGenerationPrompt` · `ProfileAnalysisPrompt` |
| 상한에 정확히 닿은 출력을 찾아 `WARN` 로그 | `ai/guardrail/TruncationDetector` |
| 스키마 상한값을 상수로 고정 (스키마와 검출기가 갈라지지 않게) | `JsonSchemas.SHORT_LABEL_MAX` 외 3개 |

**실패시키지 않는다.** 잘린 라벨은 보기 나쁠 뿐 가드레일 위반이 아니다. 이것으로 분석 전체를 실패로 돌리면 사용자가 더 손해다.

> **새 필드에 `maxLength`를 줄 때** — 그 자리가 라벨인지 문장인지 먼저 정하고, 프롬프트에 글자 수를 **숫자로** 적는다. 스키마만 조이면 잘린 말이 화면에 나간다.

### N-2. 로컬 로깅이 사진 key와 고점 원문을 그대로 남기고 있었다 〔2026-08-14 · D2〕

**증상** — `application-local.yml`의 `org.hibernate.orm.jdbc.bind: TRACE` 때문에 로그에 이렇게 남았다.

```text
binding parameter (3:VARCHAR) <- [references/{userId}/{uuid}.jpg]
binding parameter (3:VARCHAR) <- [자연스럽고 건강해 보이는 분위기, 깔끔하고 ...]
```

**원인** — D1에서는 프로필 key 정도만 지나가 눈에 띄지 않았다. D2에서 `analyses.input_text`와 AI 생성 문구 전체가 이 경로를 타면서 **규칙 9와 PRD §9를 정면으로 위반**하게 됐다. 기능은 멀쩡히 동작하므로 테스트로는 절대 잡히지 않는다.

**재발 방지** — 해당 줄을 지우고, 그 자리에 **왜 켜면 안 되는지**를 주석으로 박아뒀다. 지우기만 하면 다음 사람이 디버깅하다 다시 켠다.

> **로그 정책은 코드 리뷰가 아니라 설정 파일 주석으로 지킨다.** 끄는 것보다 "켜면 무엇이 새는지"를 그 자리에 적는 편이 오래간다.

### N-3. Docker가 없다고 테스트를 통째로 못 돌리게 두지 않는다 〔2026-08-14 · D2〕

**증상** — 이 환경에 Docker가 없어 `./gradlew test`가 Testcontainers 기동 실패로 **전부** 죽었다. 그 바람에 Docker가 필요 없는 가드레일·스키마 단위 테스트까지 실행 수단이 없었다.

**재발 방지** — 태그로 갈랐다. `IntegrationTestSupport`에 `@Tag("integration")`을 붙였고(상속된다), `build.gradle`이 두 갈래로 나눈다.

```bash
./gradlew test              # Docker 불필요. 가드레일 · 스키마 · 상태 매핑
./gradlew integrationTest   # Docker 필요. Testcontainers
```

> 돌릴 수 없는 테스트는 없는 테스트다. 환경 제약이 생기면 테스트를 포기하지 말고 **실행 경로를 쪼갠다.**

### N-4. `@Modifying(clearAutomatically = true)`는 영속성 컨텍스트를 비운다 〔2026-08-14 · D2〕

분석권 차감(`consumeCredit`)이 그런 벌크 UPDATE다. **엔티티를 먼저 로드해두고 차감하면 그 엔티티의 변경이 통째로 사라진다.**

```java
// 틀림 — analysis.markDone()이 반영되지 않는다
Analysis analysis = analysisRepository.findById(id).orElseThrow();
subscriptionRepository.consumeCredit(userId);   // ← 여기서 컨텍스트가 비워진다
analysis.markDone();

// 맞음 — 차감 → 로드 → 변경
subscriptionRepository.consumeCredit(userId);
Analysis analysis = analysisRepository.findById(id).orElseThrow();
analysis.markDone();
```

**재발 방지** — `AnalysisTxService.completeWithResult`의 Javadoc에 **차감 → 로드 → 저장** 순서와 그 이유를 못박았다. 순서를 바꾸면 안 되는 코드에는 이유를 코드 옆에 둔다.

### N-6. `java.time`의 기본 직렬화가 API 계약과 다르다 〔2026-08-14 · D3〕

**증상** — 목표 화면의 알림 시각이 `"21:00:00"`으로 나갔다. API.md §6.7의 계약은 `"21:00"`이다.

**원인** — `LocalTime`은 Jackson 기본 설정에서 초까지 찍는다. 프론트가 이 값을 그대로 화면에 쓰므로 시안과 어긋난다. **기능 테스트로는 절대 안 잡힌다** — 값은 맞고 형식만 다르기 때문이다.

**재발 방지** — 해당 필드에 `@JsonFormat(pattern = "HH:mm")`을 걸고, `RoutineDtosSerializationTest`로 고정했다. 같은 테스트가 아래 두 번째 함정도 함께 막는다.

> **응답 형식은 기능 테스트가 아니라 직렬화 테스트로 지킨다.** 시각·날짜·null 처리는 값이 맞아도 모양이 틀릴 수 있다.

### N-7. 전역 `non_null` 설정이 문서에 명시된 `null` 키를 지운다 〔2026-08-14 · D2·D3〕

`application.yml`의 `spring.jackson.default-property-inclusion: non_null` 때문에 값이 null인 필드는 **키째로** 응답에서 사라진다. API.md가 `"failureCode": null`, `"category": null`, `"thumbnailUrl": null`처럼 null을 명시한 자리까지 없어진다.

**재발 방지** — null을 계약한 응답 레코드에 `@JsonInclude(JsonInclude.Include.ALWAYS)`를 붙였다(`AnalysisStatusResponse` · `ResultResponse` · `ComparisonImage` · `RoutineSummary` · `RoutineDetailResponse` · `TaskView` · `DrawerItem`). `RoutineDtosSerializationTest`가 회귀를 막는다.

> **새 응답 DTO를 만들 때** — API.md 예시에 `null`이 찍혀 있으면 `@JsonInclude(ALWAYS)`가 필요하다. 아니면 프론트가 "값이 null"과 "필드가 없음"을 따로 다뤄야 한다.
> 참고: `ProfileResponse.analysisSummary`는 아직 이 처리가 안 되어 있다. (HANDOVER.md §9-5)

### N-8. soft delete 테이블의 UNIQUE 제약은 범위를 좁혀야 한다 〔2026-08-14 · D3-5〕

**증상** — 계정을 삭제한 사람이 **같은 이메일로 다시 가입하면 500**이 났다.

```text
중복된 키 값이 "users_email_key" 고유 제약 조건을 위반함
```

**원인** — 유일성 기준이 두 곳에서 어긋나 있었다.

| | 기준 |
| --- | --- |
| 애플리케이션 (`existsByEmailAndDeletedAtIsNull`) | **활성 계정 중** 유일 |
| DB (`users.email UNIQUE`) | **모든 행 중** 유일 |

soft delete라 행이 남으므로, 앱은 "중복 아님"으로 통과시키고 INSERT에서 DB가 막는다. **계정 삭제 기능이 없던 D1~D3-4 동안은 드러날 수 없었다.**

**재발 방지** — `V5`에서 부분 유니크 인덱스로 바꿨다. 저장소가 이미 쓰던 방식이다.

```sql
CREATE UNIQUE INDEX ux_users_email_active ON users(email) WHERE deleted_at IS NULL;
```

> **soft delete 하는 테이블에 UNIQUE를 걸 때는 `WHERE <살아있음>`을 함께 건다.**
> 앱의 중복 검사 쿼리에 `deleted_at IS NULL`이 붙어 있다면, 인덱스에도 붙어야 한다.
> 두 기준이 다르면 "검사는 통과했는데 저장이 실패"하는 500이 난다.

### N-5. 한글이 든 SQL을 셸에서 psql로 파이프하지 않는다 〔2026-08-14 · D2〕

`psql -c "INSERT ... '좀비 분석'"`이 `"UTF8" 인코딩에서 사용할 수 없는 문자가 있음`으로 실패했다. Git Bash → psql 구간에서 코드페이지가 깨진다. HANDOVER.md의 "PowerShell로 한글 파일 조작 금지"와 **같은 뿌리의 문제**다.

**재발 방지** — 점검용 SQL은 **ASCII로 쓴다.** 한글 데이터를 넣어야 하면 psql이 아니라 애플리케이션 API로 넣는다. 굳이 psql을 써야 하면 `PGCLIENTENCODING=UTF8`을 걸고 `-f 파일.sql`로 실행한다.

---

## 5. 브랜치 · 커밋

| 브랜치 | 용도 |
| --- | --- |
| `codex/readme` | 기본 브랜치 (공용 문서) |
| `frontend` | 프론트 작업 |
| `backend` | 백엔드 작업 |

- 기본 브랜치에 직접 커밋하지 않는다. 공용 문서 수정은 사용자에게 확인한다.
- 커밋 메시지는 한국어, `type: 요약` 형식 (`docs:` `feat:` `fix:` `chore:`).
- **커밋·푸시는 사용자가 요청할 때만 한다.**

---

## 6. 실행

```bash
# 백엔드 — Docker 필요
docker compose -f backend/docker-compose.yml up -d
cd backend && SPRING_PROFILES_ACTIVE=local ./gradlew bootRun

# 테스트 (Testcontainers가 PostgreSQL을 띄운다)
cd backend && ./gradlew test
```

`.env`는 `backend/.env.example`을 복사해 만든다. 커밋하지 않는다.

Gradle은 따로 설치할 필요가 없다. Wrapper(8.10.2)가 저장소에 포함되어 있다.
