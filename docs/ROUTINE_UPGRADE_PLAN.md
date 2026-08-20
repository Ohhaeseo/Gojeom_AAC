# 루틴 고도화 계획

[고도화 설계안]을 이 저장소의 **실제 코드에 대고** 옮긴 것이다. 설계안이 옳다고 본
것은 그대로 받고, 이 코드베이스에서만 드러나는 함정과 순서를 더했다.

사용자가 요청한 세 가지가 출발점이다.

> *"없는 단어나 말을 지어서 하지 말고, 필수 루틴이랑 선택 루틴으로 나눠서 생성해줘.
> 루틴을 생성할 때 좀 구체적으로 작성을 해줘."*

이 셋은 설계안 §11의 **1단계**와 정확히 겹친다. 그래서 1단계만 먼저 끝내고 2·3단계는
그 뒤에 판단한다.

---

## 1. 지금 코드가 어디까지 와 있나

설계안을 읽기 전에 **측정한 사실**부터 적는다. 계획이 어디서 시작하는지가 달라진다.

### 루틴 태스크가 담는 것

| | AI 스키마 (`JsonSchemas.ROUTINE_*`) | DB (`routine_tasks`) |
| --- | --- | --- |
| 있는 것 | `category` `title` `timing` `durationLabel` `amountLabel` `frequencyPerWeek` | 위 + `scheduled_date` `weekly_target` `week_start` `status` |
| **없는 것** | **`importance` `problemCode` `reason` `phase`** | 같음 |

태스크 개수는 스키마가 **4~6개**로 묶어 두었다. 목표 단위로는 `title`,
`dietGuide`, `durationWeeks`가 있다.

### 분석 결과가 담는 것

```
categoryChanges: [{ category, description(200자) }] × 3
dailyCares:      [{ ... }] × 3
```

**설명 문자열뿐이다.** 설계안이 `GapItem`으로 지적한 공백이 여기 정확히 있다 —
`problemCode`도 `priority`도 `evidence`도 없어서, 루틴 생성이 분석 결과를
**다시 읽어 해석**해야 한다. 그 해석이 곧 지어내기가 일어나는 자리다.

### 상품 카탈로그가 담는 것

```java
record Item(String id, String name, List<String> tags, String summary)
```

설계안 §8이 필요하다고 한 `targetProblemCodes` · `ingredients` · `warnings`가 없다.

### 마이그레이션

`V1` … `V15`. 다음은 **`V16`**이다.

---

## 2. 🔴 설계안이 놓친 것 — 태스크가 늘면 V15가 곱한다

**이 저장소에만 있는 제약이라 설계안이 알 수 없었다.** 먼저 결정해야 한다.

V15는 태스크를 **기간 안의 날짜마다 펼쳐** 저장한다
([TaskScheduleExpander] · [08-19 인수인계](HANDOVER_2026-08-19.md) §2).

```
지금:  태스크 5개 × 52주 × 7일 = 1,820행
```

여기에 `CORE` / `SUPPORT` / `OPTIONAL`을 나누면 태스크 총량이 늘 수밖에 없다.
스키마 상한을 4~6에서 8~12로 올리면:

```
그러면: 태스크 12개 × 52주 × 7일 = 4,368행   ← 목표 하나에
```

목표를 3개 만들면 13,000행이다. 조회·집계·캘린더가 전부 무거워진다.

### 결정 — `OPTIONAL`은 날짜로 펼치지 않는다

| 중요도 | 날짜 배정 | 화면 |
| --- | --- | --- |
| `CORE` | **편다** | 오늘 할 일에 그대로 |
| `SUPPORT` | **편다** | 오늘 할 일에 접어서 |
| `OPTIONAL` | **펴지 않는다** | 목표 상세에 "해보면 좋은 것"으로 목록만 |

`OPTIONAL`은 *"사용자가 원할 때 추가하는 행동"*이라 날마다 체크할 대상이 아니다.
행 수도 늘지 않는다. 나중에 사용자가 고르면 그때 펼치면 된다.

> 이것을 정하지 않고 필드만 추가하면 **행이 두 배가 된 뒤에 알게 된다.**

---

## 3. 1단계 — 지금 요청한 세 가지

### 3-1. "지어내지 말 것"은 프롬프트로 못 막는다

🔴 **가장 중요한 판단이다.** 지금 프롬프트는 이미 170줄이고 *"구체적인 동작을
만들라"*고 잘 제약하고 있다. 그런데도 08-19 인수인계는 `timing`("주 3회 저녁")과
`frequencyPerWeek`(3)가 **어긋난 적이 있다**고 적어 두었다.

> **모델에게 부탁한 것은 지켜지지 않을 수 있고, 스키마로 막은 것은 지켜진다.**

그래서 "지어내지 않기"는 프롬프트 문장이 아니라 **세 겹의 구조**로 만든다.

| 겹 | 방법 | 막는 것 |
| --- | --- | --- |
| 1. 스키마 | `problemCode`를 **JSON Schema `enum`**으로 | 없는 문제를 만들어 내는 것 |
| 2. 후검증 | `evidence`의 값이 **입력에 실제로 있었는지** 서버가 대조 | 관찰하지 않은 상태를 근거로 대는 것 |
| 3. 후검증 | `productIds`를 카탈로그와 대조해 **없는 것은 버린다** | 없는 제품을 추천하는 것 |

`ProductRecommendationService`가 이미 3번과 비슷한 것을 한다 — 그 방식을 넓힌다.

**문제 코드는 카테고리당 4~6개로 시작한다.** 설계안 §4의 초안을 그대로 쓰되,
많을수록 좋은 것이 아니다 — 코드가 많으면 모델이 아무거나 고르고, 그러면 enum을
둔 의미가 없어진다.

```java
public enum ProblemCode {
    // SKIN
    REDNESS_TENDENCY, BLEMISH_TENDENCY, SEBUM_IMBALANCE, DEHYDRATION_TENDENCY,
    TEXTURE_UNEVENNESS, UV_CARE_GAP,
    // BODY
    BODY_FAT_MANAGEMENT, MUSCLE_DEVELOPMENT, POSTURE_BALANCE, LOW_ACTIVITY,
    // HEALTH
    SLEEP_IRREGULARITY, RECOVERY_GAP, MEAL_IRREGULARITY, HYDRATION_GAP;
}
```

🔴 **코드마다 어느 카테고리 것인지 함께 둔다.** 서버가 `problemCode`와 태스크의
`category`가 맞는지 검사해야 하는데(설계안 §9), 코드에 그 정보가 없으면 검사할 수
없다. `Category`를 필드로 갖는 enum으로 만든다.

### 3-2. "필수 / 선택"

```java
public enum RoutineImportance { CORE, SUPPORT, OPTIONAL }
```

- **AI 스키마**: `importance`를 `required`에 넣고 enum으로 제한
- **DB**: `routine_tasks.importance VARCHAR(10) NOT NULL DEFAULT 'CORE'`
- **후검증**: 카테고리마다 `CORE`가 **최소 1개**. 없으면 재시도하지 말고 그
  카테고리에서 가장 앞선 태스크를 `CORE`로 올린다 — 사용자를 빈손으로 돌려보내지
  않는다
- **화면**: 오늘 할 일은 `CORE`가 먼저, `SUPPORT`는 그 아래. `OPTIONAL`은 목표
  상세에만

### 3-3. "구체적으로"

`reason`과 `expectedEffect`를 태스크에 넣는다. **이 둘이 없으면 아무리 프롬프트를
고쳐도 "물 마시기"가 나온다** — 모델에게 근거를 적게 하면 근거 없는 행동을 쓰기
어려워진다.

```java
record PlannedTask(
    Category category,
    RoutineImportance importance,   // 새로
    ProblemCode problemCode,        // 새로
    String title,
    String timing,
    String durationLabel,
    String amountLabel,
    int frequencyPerWeek,
    String reason,                  // 새로 — 왜 이 사람에게 이 행동인가
    String expectedEffect           // 새로 — 무엇이 어떻게 달라지는가
) {}
```

**태스크 상한은 4~6 → 6~10으로만 올린다.** `OPTIONAL`을 펼치지 않기로 했으니
날짜 행은 크게 늘지 않는다. 그래도 12까지 가지 않는 이유는 §2의 곱셈이다.

---

## 4. 1단계 작업 목록

| # | 무엇 | 어디 | 비고 |
| --- | --- | --- | --- |
| 1 | `ProblemCode` · `RoutineImportance` enum | `common/enums` | `Category`를 필드로 |
| 2 | AI 스키마에 4개 필드 추가 | `JsonSchemas` | `enum`으로 제한 · `required`에 |
| 3 | 프롬프트에 규칙 추가 | `RoutineGenerationPrompt` | 설계안 §10 |
| 4 | **`V16__routine_task_importance.sql`** | 마이그레이션 | 아래 주의 |
| 5 | 엔티티·DTO 확장 | `RoutineTask` · `RoutineDtos` | |
| 6 | 후검증 | `RoutineService` | §3-1의 2·3번 + CORE 보장 |
| 7 | `OPTIONAL`은 펼치지 않기 | `TaskScheduleExpander` | §2 |
| 8 | 화면 — CORE 먼저, OPTIONAL 분리 | `home` · `routines` · `routine-calendar` | |
| 9 | 태스크 카드에 `reason` 노출 | `routines` | 접었다 펴기 |

### 🔴 마이그레이션에서 반드시 지킬 것

**기존 목표는 새 필드가 비어 있다.** V15에서 겪은 것과 같다 —
*"V15는 스키마만 바꾸고 이미 저장된 태스크를 다시 펼치지 않는다"*
([08-19](HANDOVER_2026-08-19.md) §6).

- `importance`는 `NOT NULL DEFAULT 'CORE'` — 옛 태스크는 전부 필수로 본다.
  그래야 화면에서 사라지지 않는다
- `problem_code` · `reason` · `expected_effect`는 **nullable**. 옛 태스크에는
  근거가 없고, 없는 것을 지어 채우면 이 작업의 목적을 스스로 어긴다
- 화면은 `reason`이 없으면 그 줄을 **그리지 않는다**. "정보 없음" 같은 문구를
  넣지 않는다

**제약을 고칠 때는 그것을 마지막으로 만진 마이그레이션부터 읽는다.** (오답 노트 N-15)

```bash
grep -rn "routine_tasks" backend/src/main/resources/db/migration/
```

---

## 5. 2단계 — 분석과 루틴을 잇는다 (`GapItem`)

1단계는 **루틴 안에서** 근거를 만든다. 2단계는 그 근거를 **분석 결과에서** 가져온다.
설계안 §3의 `Gap → Strategy → Routine`이 여기다.

지금은 `categoryChanges.description`(200자 문장)만 있어서, 루틴 생성이 그 문장을
다시 해석한다. **해석이 한 번 더 일어나는 곳마다 지어낼 여지가 생긴다.**

- `AnalysisResult`에 `gapItems` 추가 — `problemCode` · `priority` · `evidence`
- `evidence`는 **입력에 있던 값만**. 인바디·수면·키·체중처럼 우리가 받은 것,
  그리고 사진에서 관찰한 것에 한한다
- 루틴 생성은 `gapItems`의 `problemCode`만 받는다 — 목록에 없는 문제로는 태스크를
  만들 수 없다

이 단계가 끝나야 *"이 행동은 고점과 어떤 차이를 줄이는가"*(설계안 §12)에 답할 수 있다.

> **1단계 없이 2단계를 먼저 하면 안 된다.** `GapItem`을 만들어도 태스크에
> `problemCode`가 없으면 이을 곳이 없다.

---

## 6. 3단계 — 기간·성분·조정

설계안 §6·§8·§11-3에 해당한다. **해커톤 범위 밖으로 본다.**

- `phaseNumber` — 1~4주 적응 / 5~12주 강화 / 13주+ 유지. 지금도 `durationWeeks`가
  4~52주라 자리는 있다
- 상품 카탈로그에 `targetProblemCodes` · `ingredients` · `warnings`
- 상품이 없을 때 **성분 가이드로 대체** — 설계안 §8의 규칙이 좋다. 억지로 추천하지
  않는 것이 지어내지 않기의 연장이다
- `adjustmentRule` — 자극·수행률 저하에 따른 조정

---

## 7. 하지 않을 것

정하지 않으면 슬그머니 들어온다.

- **점수·등급·순위** — 설계안 §2. `priority`는 서버가 순서를 정하는 값이지
  사용자에게 보여주는 점수가 아니다
- **진단** — "여드름이 있습니다"가 아니라 "붉은 트러블 양상이 관찰됩니다"
- **치료 보장** — 성분은 목적만 말한다
- **문제 코드 남발** — 카테고리당 4~6개로 시작한다. 늘리는 것은 실제 분석 결과가
  쌓인 뒤다
- **태스크 수 늘리기로 개인화 흉내내기** — 수행률이 떨어지면 고도화가 아니다
  (설계안 §2)

---

## 8. 어떻게 검증할 것인가

이 저장소가 이미 배운 것 — **AI를 부르는 경로는 실제로 한 번 태워 본다.**
단위 테스트로는 잡히지 않는 것이 많았다 ([08-19](HANDOVER_2026-08-19.md) §4).

```bash
cd backend && set -a && . ./.env && set +a && SPRING_PROFILES_ACTIVE=local ./gradlew bootRun
```

실측으로 확인할 것:

1. 카테고리마다 `CORE`가 1개 이상 나오는가
2. `problemCode`가 태스크의 `category`와 맞는가
3. `reason`이 **그 사용자의 입력을 가리키는가** — "피부가 건조하신 분들은"처럼
   일반론이면 실패다
4. `OPTIONAL`이 날짜로 펼쳐지지 않는가 (행 수를 센다)
5. 4주 목표와 24주 목표가 **다르게** 나오는가
6. 옛 목표(마이그레이션 전 데이터)가 화면에서 깨지지 않는가

단위 테스트로 못박을 것 — 후검증 규칙(§3-1), `OPTIONAL` 제외(§2),
CORE 보장(§3-2). **AI 응답을 흉내낸 고정 JSON으로 검증기만 시험한다.**

---

## 9. 순서와 크기

| 단계 | 내용 | 마이그레이션 | 크기 |
| --- | --- | --- | --- |
| **1** | importance · problemCode · reason | `V16` | 백엔드 반나절 + 프론트 2~3시간 |
| 2 | `GapItem` — 분석과 루틴 잇기 | `V17` | 1일 |
| 3 | phase · 성분 · 조정 규칙 | `V18`+ | 범위 밖 |

**1단계만으로 요청한 세 가지가 다 채워진다.** 2단계는 "왜 이 행동인가"의 근거를
분석 결과까지 밀어 올리는 것이고, 3단계는 기간에 따라 루틴이 달라지게 하는 것이다.

---

## 10. 설계안에서 가장 옳은 문장

> *"프롬프트만 길게 고치면 더 자세한 일반 루틴이 나올 뿐이다."*

이 저장소가 이미 그 증거를 갖고 있다. 프롬프트가 `timing`과 `frequencyPerWeek`를
일치시키라고 **못 박아 두었는데도** 어긋난 적이 있다. 그래서 이 계획은 프롬프트를
고치는 것으로 시작하지 않고 **enum·스키마·후검증**으로 시작한다.

프롬프트는 그 뒤에 다듬는다.
