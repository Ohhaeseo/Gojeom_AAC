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
| 6 | 참고 이미지 속 **타인의 얼굴을 복제하지 않는다.** (PRD G-2) 막는 것은 **이목구비·골격** — 그 사람이 누구인지를 결정하는 부분이다. **헤어스타일과 피부 상태는 합성 대상이다** (사용자가 그걸 참고하려고 올린 사진이다). 경계는 아래 표 참조 |

**비교 이미지의 합성 경계** 〔2026-08-14 확정〕 — 이 단계가 만드는 것은 사용자 사진을 기준으로 한 **합성 이미지**다.

| 참고 사진에서 가져온다 | 사용자 사진에서 지킨다 |
| --- | --- |
| 헤어스타일 (길이·형태·앞머리·컬·색) | 이목구비의 형태와 배치, 얼굴 골격 |
| 피부 **상태** (결·균일함·생기) | 나이 · 인종 · 성별 · 체형 · **고유 피부색** |
| 전체 분위기와 색감 | |

> **피부는 "상태"만 가져오고 "피부색"은 바꾸지 않는다.** 피부색은 인종과 얽혀 있어
> "인종을 바꾸지 않는다"와 충돌하고, 미용 AI가 넘지 말아야 할 선이다. 이 제품이
> 말하는 피부도 색이 아니라 상태다. (구현: `ai/prompt/ImageGenerationPrompt`)
>
> 이 경계는 **PRD G-2 · §8.2**에 반영되어 있다. API.md §7.5~7.6과 backend/ARCHITECTURE.md §6.5도 같은 문구를 쓴다.

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

### N-7. 전역 `non_null` 설정이 문서에 명시된 `null` 키를 지운다 〔2026-08-14 · D2·D3 / 2026-08-15 마무리〕

`application.yml`의 `spring.jackson.default-property-inclusion: non_null` 때문에 값이 null인 필드는 **키째로** 응답에서 사라진다. API.md가 `"failureCode": null`, `"category": null`, `"thumbnailUrl": null`처럼 null을 명시한 자리까지 없어진다.

**재발 방지** — null을 계약한 응답 레코드에 `@JsonInclude(JsonInclude.Include.ALWAYS)`를 붙였다.

| 레코드 | 고정한 테스트 |
| --- | --- |
| `AnalysisStatusResponse` · `ResultResponse` · `ComparisonImage` | — |
| `RoutineSummary` · `RoutineDetailResponse` · `TaskView` · `DrawerItem` | `RoutineDtosSerializationTest` |
| `ProfileResponse` 〔2026-08-15〕 | `ProfileDtosSerializationTest` |

**`ProfileResponse`만 하루 늦게 붙었다.** 나머지를 고칠 때 같이 못 본 이유가 있다 — 이 구멍은 **값이 null일 때만** 드러나는데, `analysisSummary`가 null인 구간은 프로필 등록 직후 AI 분석이 끝나기 전 **몇 초뿐**이다. 화면을 열어보는 방식으로는 재현 확률이 낮다.

> **새 응답 DTO를 만들 때** — API.md 예시에 `null`이 찍혀 있으면 `@JsonInclude(ALWAYS)`가 필요하다. 아니면 프론트가 "값이 null"과 "필드가 없음"을 따로 다뤄야 한다.
> **찾는 방법은 화면이 아니라 grep이다.** 응답 레코드에서 nullable 필드를 세고, `@JsonInclude`가 없는 레코드를 목록으로 뽑는다. "null이 잠깐만 스치는 필드"는 눈으로 보면 반드시 놓친다.

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

### N-9. 프롬프트 안에서 서로 부딪히는 지시는 조용히 무시된다 〔2026-08-14 · 이미지 생성〕

**증상** — 비교 이미지 합성에서 헤어스타일은 옮겨졌는데 **피부만 아무 변화가 없었다.** 오류도 경고도 없었다.

**원인** — 프롬프트에 모순된 요구를 나란히 적어뒀다.

```text
- 피부 — 톤과 결을 참고 사진에서 가져온다
- 나이, 인종, 성별을 바꾸지 않는다
```

피부색과 인종은 얽혀 있다. 모델은 둘 중 안전한 쪽(유지)을 골랐고, **어느 쪽을 골랐는지 출력만 봐서는 알 수 없었다.** 스키마 위반도 아니고 예외도 아니라 후검증에도 걸리지 않는다.

**재발 방지** — 요구를 충돌하지 않는 단위로 쪼갰다. 피부는 **"상태"(결·균일함·생기)만** 가져오고 **"피부색"은 유지**한다고 명시했다. 두 지시가 더 이상 같은 대상을 두고 싸우지 않는다.

> **프롬프트를 고칠 때는 새 문장이 기존 문장과 같은 대상을 두고 반대 방향을 가리키지 않는지 본다.**
> 이미지 단계는 JSON 스키마가 없어 프롬프트가 유일한 통제 수단이고, 모순의 결과가
> "조용한 무동작"으로 나타나 눈치채기 어렵다. **바뀌길 기대한 것이 안 바뀌면 프롬프트 안의 충돌부터 의심한다.**

### N-5. 한글이 든 SQL을 셸에서 psql로 파이프하지 않는다 〔2026-08-14 · D2〕

`psql -c "INSERT ... '좀비 분석'"`이 `"UTF8" 인코딩에서 사용할 수 없는 문자가 있음`으로 실패했다. Git Bash → psql 구간에서 코드페이지가 깨진다. HANDOVER.md의 "PowerShell로 한글 파일 조작 금지"와 **같은 뿌리의 문제**다.

**재발 방지** — 점검용 SQL은 **ASCII로 쓴다.** 한글 데이터를 넣어야 하면 psql이 아니라 애플리케이션 API로 넣는다. 굳이 psql을 써야 하면 `PGCLIENTENCODING=UTF8`을 걸고 `-f 파일.sql`로 실행한다.

### N-10. 웹 picker의 `blob:` URI에는 확장자가 없다 〔2026-08-17 · 프론트〕

**증상** — PNG를 골라 올리면 S3 업로드까지 **성공한 뒤** 프로필 등록에서 400이 났다. 스토리지에는 아무도 참조하지 않는 고아 객체만 남았다.

**원인** — 업로드 Content-Type을 **URI 확장자**로 정하고 있었다. 웹 picker가 주는 `blob:http://localhost:8081/<uuid>`에는 확장자가 없어 **무엇을 고르든 `image/jpeg`로 신고**됐다. 네이티브는 `file:///...jpg`라 확장자가 있어 이 문제가 드러나지 않는다. 서버가 실제 바이트와 신고한 형식을 대조하면서(`ImageContentInspector`) 비로소 표면화됐다.

**재발 방지** — `Blob.type`을 정본으로 쓴다.

> **플랫폼마다 URI 모양이 다르다.** 파일 메타데이터는 경로 문자열이 아니라 **객체 자신에게 묻는다.**

### N-11. 중첩 `Pressable`은 부모까지 함께 발동한다 〔2026-08-17 · 프론트〕

**증상** — `−`·`+` 스테퍼를 누르면 **카드가 접혔다.** 특히 최소값에서 `−`를 누르면 카드가 통째로 닫혔다.

**원인** — 스테퍼를 카드 `Pressable` 안에 뒀더니 이벤트가 카드로 올라갔다. **비활성 `Pressable`은 이벤트를 삼키지도 않아서** 눌리지 않는 버튼일수록 부모만 발동시킨다.

**재발 방지** — 누를 수 있는 영역은 헤더만 두고, 내부 컨트롤은 형제로 뺐다. 서랍의 삭제 버튼도 같은 이유로 카드 밖에 있다.

> **카드 안에 버튼을 넣을 때는 카드 전체를 누르게 만들지 않는다.**

### N-12. 화면이 서버 데이터를 메모리로만 들고 있다 〔2026-08-17 · 프론트〕

**증상** — 서랍에 결과가 저장돼 있는데도 루틴 화면이 "아직 저장한 분석이 없어요"라고 말했다. 홈의 `최근 분석 결과`와 `/goal`의 빈 화면도 새로고침 후 비어 보였다.

**원인** — `result`·`saved`·`tasks`가 `AppState` **메모리에만** 있어 새로고침하면 사라진다.

**재발 방지** — **"있는지 없는지"를 판단할 때는 메모리가 아니라 서버에 물어본다.** 루틴 화면은 `loadDrawer()`로 개수를 받아 쓴다.

> 남은 곳이 또 있는지는 **"메모리만 보고 있는지"** 를 기준으로 찾으면 된다.

### N-13. 네이티브 라이브러리가 웹에서 조용히 죽는다 〔2026-08-18 · 프론트〕

**증상** — `react-native-draggable-flatlist`를 넣었더니 **끌어도 아무 일이 없었다.** 렌더링은 정상이고 에러도 없다.

**원인** — 셀 위치를 `findNodeHandle`로 재는데 **RN Web에 그 API가 없다.** 콘솔에 경고 한 줄만 남기고 예외를 던지지 않아, 화면만 보면 "왜 안 되지"에서 멈춘다.

**재발 방지** — `PanResponder`(코어)로 직접 만들었다(`DragList`). **끌기와 ▲▼ 버튼을 둘 다 준다** — 순서를 바꾸는 길이 최소 하나는 늘 열려 있어야 한다.

> **네이티브 라이브러리를 웹에 쓸 때는 실제로 그 동작을 해 보고 확인한다. 렌더링이 된다고 동작하는 것이 아니다.**

### N-14. 애너테이션과 선언 사이에 새 타입을 끼워 넣지 않는다 〔2026-08-18 · 백엔드〕

**증상** — 경로 A 응답에서 `category: null` 키가 사라졌다. 기존 회귀 테스트가 잡았다.

**원인** — `RoutineRenameRequest`를 `RoutineSummary` **바로 위**에 넣으면서 `@JsonInclude(ALWAYS)`가 새 레코드에 붙어버렸다. 원래 붙어 있어야 할 선언에서는 떨어져 나갔다.

**재발 방지** — 새 타입은 애너테이션이 붙은 선언 **위가 아니라 아래**에 놓는다. N-7(전역 `non_null`이 문서에 명시된 `null` 키를 지운다)과 **같은 증상, 다른 원인**이다.

> **애너테이션은 바로 다음 선언에 붙는다.** 파일에 타입을 추가할 때는 직전 줄이 애너테이션인지 본다.

### N-15. 마이그레이션을 쓰기 전에 기존 것을 전부 읽는다 〔2026-08-18 · 백엔드〕

**증상** — V9의 `CREATE UNIQUE INDEX ux_consents_user_code`가 **이미 존재한다**로 실패했다.

**원인** — V1이 이미 만들고 있었다. V1의 **앞부분만 보고** 뒤쪽 인덱스 선언을 놓쳤다.

**재발 방지** — 새 마이그레이션에 인덱스·제약을 넣기 전에 **`grep`으로 이름을 먼저 확인한다.** 파일을 위에서 조금 읽는 것으로는 부족하다.

> 관련 — **마이그레이션을 추가했으면 백엔드를 재시작해야 적용된다.** 재시작을 잊고 "칼럼이 없다"로 한 번 더 막혔다.

### N-16. 한글은 psql뿐 아니라 **curl에서도** 깨진다 〔2026-08-18 · 점검〕

**증상** — curl 본문에 한글 닉네임을 넣었더니 400이 났다. 요청 자체는 올바른 형식이었다.

**원인** — N-5와 같은 뿌리다. 셸을 거치는 구간에서 코드페이지가 깨진다. **N-5는 psql만 말하고 있어서** curl은 괜찮다고 생각했다.

**재발 방지** — 점검용 데이터는 **ASCII로 쓴다.** 한글이 꼭 필요하면 **UTF-8 파일로 만들어** `psql -f`처럼 파일로 넘긴다. curl은 `-d @파일`.

> **"셸을 거치는 한글"이 문제지 특정 도구가 문제가 아니다.** 새 CLI 도구를 쓸 때마다 같은 함정이 있다고 보면 된다.

### N-17. Docker가 없다고 로컬 DB까지 없는 것은 아니다 〔2026-08-18 · 점검〕

**증상** — `docker`가 없어 백엔드를 못 띄운다고 판단하고, 서버가 필요한 확인을
전부 "미실측"으로 넘겼다.

**원인** — N-3이 "Docker가 없다"고 적어 둔 것을 **"DB가 없다"로 읽었다.** 실제로는
이 PC에 PostgreSQL 18이 서비스(`postgresql-x64-18`)로 **이미 돌고 있었다.**
`psql`이 PATH에 없어 `command not found`만 보고 지나쳤다.

**재발 방지** — DB가 필요하면 **컨테이너부터 찾지 말고 서비스와 포트를 본다.**

```bash
# PATH에 없어도 서비스는 돌고 있을 수 있다
powershell -c "Get-Service *postgres*; Get-NetTCPConnection -LocalPort 5432"
```

### N-18. 제공자 기본값을 "나쁜 값"으로 단정하지 않는다 〔2026-08-18 · AI〕

**증상** — `image_url.detail`을 안 보내면 "OpenAI가 auto로 **축소**해 읽는다"고 단정하고,
`detail: "high"`를 판독 품질을 올리는 가장 싼 방법으로 제안했다. 주석과 문서에도 그렇게 적었다.

**원인** — 문서에서 읽은 동작을 **우리 모델·우리 이미지 크기에서 재보지 않았다.**
실측하니 `gpt-5.4`는 256~1024px 전 구간에서 auto와 high의 입력 토큰이 **같았다**
(2373 대 2373 등, 차이 ±1은 잡음). 지금 핀에서는 이 파라미터가 아무것도 바꾸지 않는다.

**재발 방지** — 품질을 올린다고 말하기 전에 **관측 가능한 지표로 확인한다.**
이미지 파라미터는 `usage.prompt_tokens`가 가장 정직한 증거다 — 실제로 더 읽었다면
토큰이 늘어난다. 같은 방식으로 모델 상향도 재봤고, 그쪽은 실제로 갈렸다
(요약 관찰 수 1.00건 → 3.00건, 같은 사진 4회씩).

```bash
# detail 유무만 바꿔 같은 사진을 두 번 부르고 prompt_tokens를 비교한다
```

**남긴 것** — `detail`은 걷어내지 않고 뒀다. 효과가 있어서가 아니라 **판독 해상도를
제공자 휴리스틱에 맡기지 않기 위해서다.** 주석에 "지금 모델에서는 차이가 없다"를
실측값과 함께 적어, 다음 사람이 같은 기대를 하지 않게 했다.

### N-19. Metro는 **고치기 전 상태**도 캐시한다 〔2026-08-18 · 프론트〕

**증상** — `goal.tsx`에 `layout.maxWidth`를 쓰고 import도 넣었는데 브라우저가
`ReferenceError: layout is not defined`를 냈다. **typecheck는 통과했고** 파일에는
import가 분명히 있었다. 개발 서버를 껐다 켜도, `.expo`와 `node_modules/.cache`를
지워도 그대로였다.

**원인** — 스타일을 먼저 고치고 import를 **나중에** 넣었다. 그 사이 잠깐 존재한
"`layout`을 쓰는데 import는 없는" 상태를 Metro가 변환 캐시에 담았고, 이후 그것을
계속 내놓았다. Metro 캐시는 프로젝트 안이 아니라 **`%TEMP%\metro-cache`**에 있어서
`.expo`를 지워도 살아남는다.

**재발 방지** — 코드와 화면이 어긋나면 **코드를 의심하기 전에 캐시를 지운다.**
특히 한 파일을 두 번에 나눠 고쳤을 때 그렇다.

```powershell
Remove-Item -Recurse -Force "$env:TEMP\metro-cache"
```

**빨리 가르는 법** — 문제의 식별자를 리터럴로 바꿔 보면 1분 안에 갈린다.
리터럴로 바꿔서 사라지면 코드가 아니라 **바인딩·캐시** 문제다.

### N-20. 이 PC의 셸은 PowerShell 5.1이다 〔2026-08-18 · 도구〕

**증상** — 사용자에게 건넨 `cd frontend && npx eas credentials -p android`가
`'&&' 토큰은 이 버전에서 올바른 문 구분 기호가 아닙니다`로 죽었다. 같은 명령에
`could not determine executable to run`까지 겹쳤다.

**원인** — 두 가지를 한꺼번에 틀렸다.
1. **PowerShell 5.1에는 `&&`가 없다.** bash 습관으로 이어 썼다.
2. **패키지 이름이 `eas`가 아니라 `eas-cli`다.** `npx eas`는 실행할 것을 못 찾는다.

**재발 방지** — 사용자에게 건네는 명령은 **PowerShell 기준**으로 쓴다. 잇는 것은
`;`이거나 줄을 나눈다. `npx`로 도구를 부를 때는 **패키지 이름**을 확인한다 —
실행 파일 이름과 다를 수 있다.

```powershell
cd C:\AAC_gojeomAI\frontend; npx eas-cli@latest whoami
```

> 에이전트가 `Bash` 도구로 돌리는 것은 Git Bash라 `&&`가 된다. **내가 되는 것과
> 사용자 터미널에서 되는 것은 다르다.**

접속 정보는 `backend/.env`에 있고, **Spring은 `.env`를 자동으로 읽지 않는다** —
`set -a && . ./.env && set +a` 로 주입한 뒤 `SPRING_PROFILES_ACTIVE=local ./gradlew bootRun`.

> **도구가 없는 것과 의존성이 없는 것은 다르다.** `docker`는 PostgreSQL을 얻는
> 여러 방법 중 하나일 뿐이다. 막혔다고 적기 전에 **필요한 것 자체**를 찾는다.
>
> 곁들여 — 접속이 안 될 때 `docker-compose.yml`의 기본값(`gojeom/gojeom`)으로
> 시험하고 "롤 비밀번호가 다르다"고 결론 내렸는데, **정본은 `.env`였다.**
> 실행에 쓰는 설정으로 시험해야 한다.

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
