# GO. (고점) — API 명세서 (Frontend ⇄ Backend 공통)

| 항목 | 내용 |
| --- | --- |
| 문서 버전 | v2.0 |
| 최종 수정일 | 2026-08-13 |
| 상위 문서 | [PRD.md](PRD.md) · [design.md](design.md) |
| 짝 문서 | [ERD.md](ERD.md) — 응답 필드와 DB 컬럼은 1:1 대응 |
| Base URL | `https://{host}/api/v1` |
| 인증 | JWT Bearer (Access 30분 / Refresh 14일) |
| 시간 형식 | ISO-8601 UTC — **KST 변환은 프론트 책임** |
| 네이밍 | 요청/응답 JSON은 `camelCase` |

> **이 문서가 프론트와 백엔드의 계약이다.** 한쪽이 임의로 필드를 추가·삭제하지 않는다.
>
> **v2 변경 요약** — Figma 시안 대조 반영. ① `priorityCategory` → `profiles.priorities` **3개 순위 배열**로 이동 ② 카테고리 Enum 3종 ③ `inputMode` 삭제, 텍스트 500자, 참고 사진 **다중** ④ `topChanges` → `categoryChanges` ⑤ `changeIntensity` 숫자 → 텍스트 ⑥ 결과 화면 **상태 2종**(FRESH/SAVED) ⑦ 서랍 **3섹션** ⑧ 인바디 6종 ⑨ **인바디 OCR 엔드포인트 신설**
>
> **v2.1** — `POST /routines`가 **경로 2종**(`FROM_ANALYSIS` / `STANDALONE`)을 받도록 확장됐다. `RoutineSourceType` Enum 신설.

---

## 1. 공통 응답 형식

```json
// 성공
{ "success": true, "data": { } }
```

```json
// 실패
{
  "success": false,
  "error": {
    "code": "ANALYSIS_NO_KEYWORD",
    "message": "조금 더 구체적으로 적어주세요.",
    "details": { "examples": ["자연스럽고 건강해 보이는 분위기"] }
  }
}
```

- `error.message`는 **그대로 사용자에게 보여줄 한국어 문구**다. 프론트가 코드별 문구를 따로 관리하지 않는다.
- 목록은 `items` + `page`로 감싼다.

```json
{ "success": true, "data": { "items": [], "page": { "number": 0, "size": 20, "totalElements": 37, "totalPages": 2 } } }
```

---

## 2. 인증 규칙

| 구분 | 헤더 |
| --- | --- |
| 인증 필요 | `Authorization: Bearer {accessToken}` |

- 랜딩·약관 조회를 제외한 모든 엔드포인트는 인증이 필요하다.
- Access Token 만료 시 `401 AUTH_TOKEN_EXPIRED` → 프론트는 refresh 후 원 요청을 1회 재시도한다. refresh도 실패하면 로그인 화면으로 보내되 **직전 경로를 저장**해 복귀시킨다.
- 타인의 리소스 접근은 `403 FORBIDDEN_RESOURCE`.

---

## 3. Enum 정의

| Enum | 값 | 표시 문구 |
| --- | --- | --- |
| `Provider` | `LOCAL` `GOOGLE` | — |
| **`Category`** | `SKIN` `BODY` `HEALTH` | 피부 / 체형 / 건강 |
| **`KeywordCategory`** | `SKIN` `FACE` `BODY` `HEALTH` | 피부 / 얼굴형 / 체형 / 건강 |
| `Gender` | `MALE` `FEMALE` `UNSPECIFIED` | 남성 / 여성 / 선택 안 함 |
| `AnalysisStatus` | `CREATED` `EXTRACTING` `KEYWORDS_READY` `GENERATING` `DONE` `FAILED` | — |
| `ImageStatus` | `SKIPPED` `PENDING` `DONE` `FAILED` | — |
| `ResultViewState` | `FRESH` `SAVED` | 분석 직후 / 서랍 열람 |
| `TaskStatus` | `PENDING` `DONE` `MISSED` | — |
| `RoutineStatus` | `ACTIVE` `COMPLETED` `CANCELED` | — |
| `RoutineSourceType` | `FROM_ANALYSIS` `STANDALONE` | 저장된 분석 결과 가져오기 / 새 루틴 만들기 |
| `Plan` | `TRIAL` `MONTHLY` `YEARLY` | 무료 체험 / 월 구독 / 연 구독 |
| `ConsentCode` | `TERMS` `PRIVACY` `BIOMETRIC` `MARKETING` | — |

**v2에서 삭제된 Enum**

| 삭제 | 사유 |
| --- | --- |
| `PriorityCategory` (4종) | `Category`(3종)로 통합. 우선순위에는 얼굴형이 없다 |
| `RoutineCategory` | `Category`와 동일해져 통합 |

> **`Category`(3종)와 `KeywordCategory`(4종)를 합치지 않는다.** 우선순위·루틴·`categoryChanges`는 3종이고, **키워드만 `FACE`를 갖는다.** 2026-08-13 AI 스파이크에서 "차분한 인상" 같은 얼굴 키워드가 3종 강제 탓에 `HEALTH`로 오분류되는 것을 확인해 분리했다.
| `InputMode` | 입력 방식 선택 화면이 없다 |
| `KeywordOrigin` | 시안의 키워드 목록에 공통/충돌 구분이 없다 |
| `ChangeTag` | `categoryChanges`가 카테고리 기반으로 바뀌었다 |

---

## 4. 에러 코드

| HTTP | code | 사용자 노출 문구 |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | 입력값을 다시 확인해주세요. |
| 401 | `AUTH_TOKEN_EXPIRED` | 로그인이 만료되었어요. |
| 401 | `AUTH_INVALID_CREDENTIALS` | 이메일 또는 비밀번호를 확인해주세요. |
| 409 | `AUTH_EMAIL_DUPLICATED` | 이미 가입된 이메일이에요. |
| 403 | `FORBIDDEN_RESOURCE` | 접근할 수 없는 항목이에요. |
| 403 | `CONSENT_REQUIRED` | 필수 항목에 동의해주세요. |
| 403 | `PROFILE_UNDERAGE` | 만 14세 이상만 이용할 수 있어요. |
| 402 | `NO_ANALYSIS_CREDIT` | 분석권을 모두 사용했어요. |
| 404 | `NOT_FOUND` | 요청한 정보를 찾을 수 없어요. |
| 409 | `PROFILE_REQUIRED` | 프로필을 먼저 등록해주세요. |
| 409 | `ANALYSIS_INVALID_STATE` | 지금은 진행할 수 없는 단계예요. |
| 413 | `FILE_TOO_LARGE` | 10MB 이하 사진을 올려주세요. |
| 422 | `IMAGE_NO_FACE` | 얼굴이 인식되지 않았어요. 정면을 향한 밝은 사진을 올려주세요. |
| 422 | `IMAGE_MULTIPLE_FACES` | 한 사람만 나온 사진을 올려주세요. |
| 422 | `IMAGE_LOW_QUALITY` | 사진이 흐리거나 어두워요. 다시 촬영해주세요. |
| 422 | `INBODY_SCAN_FAILED` | 서류를 읽지 못했어요. 직접 입력해주세요. |
| 422 | `ANALYSIS_NO_KEYWORD` | 조금 더 구체적으로 적어주세요. |
| 422 | `CONTENT_POLICY_BLOCKED` | 분석할 수 없는 내용이 포함되어 있어요. |
| 500 | `AI_PROVIDER_ERROR` | 분석 중 문제가 생겼어요. 다시 시도해주세요. |
| 500 | `INTERNAL_ERROR` | 잠시 후 다시 시도해주세요. |
| 504 | `ANALYSIS_TIMEOUT` | 분석이 지연되고 있어요. 다시 시도해주세요. |

- `NO_ANALYSIS_CREDIT` · `CONTENT_POLICY_BLOCKED` · `ANALYSIS_TIMEOUT` · `INBODY_SCAN_FAILED` 는 **분석권을 차감하지 않는다.**
- `IMAGE_*` 는 프론트 MediaPipe 1차 차단 + 서버 2차 검증에서 동일 코드를 쓴다.

---

## 5. 엔드포인트 개요

| # | Method | Path | 인증 | 설명 | PRD | 상태 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | POST | `/auth/signup` | — | 회원가입 | F-01 | ✅ |
| 2 | POST | `/auth/login` | — | 로그인 | F-01 | ✅ |
| 3 | POST | `/auth/oauth/google` | — | Google 로그인 | F-01 | ✅ |
| 4 | POST | `/auth/refresh` | — | 토큰 갱신 | F-01 | ✅ |
| 5 | POST | `/auth/logout` | ✔ | 로그아웃 | F-01 | ✅ |
| 6 | GET | `/users/me` | ✔ | 내 정보 + 온보딩 상태 | F-01 | ✅ |
| 7 | PATCH | `/users/me` | ✔ | 표시 이름 변경 | F-13 | ✅ |
| 7-1 | DELETE | `/users/me` | ✔ | 계정 삭제 | §10 | ✅ |
| 8 | POST | `/uploads/presigned` | ✔ | 업로드용 presigned URL | F-02 | ✅ |
| 9 | POST | `/profiles` | ✔ | 프로필 등록 | F-02·F-04 | ✅ |
| 10 | GET | `/profiles/me` | ✔ | 프로필 조회 | F-13 | ✅ |
| 11 | PATCH | `/profiles/me` | ✔ | 신체 정보 수정 (**바뀌면 프로필 요약 재생성**) | F-13 | ✅ |
| 12 | PATCH | `/profiles/me/priorities` | ✔ | **우선순위 변경** | F-02·F-13 | ✅ |
| 13 | DELETE | `/profiles/me/photo` | ✔ | 사진 삭제 | §10 | ✅ |
| 14 | POST | `/profiles/inbody/scan` | ✔ | **인바디 서류 스캔(OCR)** | F-03 | ✅ |
| 15 | POST | `/analyses` | ✔ | 고점 입력 → 키워드 추출 시작 | F-05 | ✅ |
| 16 | GET | `/analyses/{id}` | ✔ | 진행 상태 폴링 | F-06 | ✅ |
| 17 | GET | `/analyses/{id}/keywords` | ✔ | 키워드 후보 조회 | F-06 | ✅ |
| 18 | POST | `/analyses/{id}/keywords/selection` | ✔ | 키워드 확정 → 결과 생성 | F-06 | ✅ |
| 19 | GET | `/analyses/{id}/result` | ✔ | 결과 조회 (`FRESH`) | F-07 | ✅ |
| 20 | POST | `/analyses/{id}/result/save` | ✔ | 서랍에 저장 | F-08 | ✅ |
| 21 | GET | `/saved-results` | ✔ | 서랍 (3섹션) | F-08 | ✅ |
| 22 | GET | `/saved-results/{id}` | ✔ | 서랍 상세 (`SAVED`) | F-08 | ✅ |
| 23 | DELETE | `/saved-results/{id}` | ✔ | 서랍 항목 삭제 | F-08 | ✅ |
| 24 | POST | `/routines` | ✔ | 목표 생성 (**경로 2종**) | F-09 | ✅ |
| 25 | GET | `/routines` | ✔ | 목표 목록 | F-09 | ✅ |
| 26 | GET | `/routines/{id}` | ✔ | 목표 상세 | F-10 | ✅ |
| 26-1 | PATCH | `/routines/{id}` | ✔ | **목표 이름 변경** | F-10 | ✅ |
| 26-2 | PATCH | `/routines/{id}/notification` | ✔ | **목표별 알림 시각** (V12) | F-11 | ✅ |
| 26-3 | PATCH | `/routines/order` | ✔ | **목표 순서 변경** | F-10 | ✅ |
| 27 | DELETE | `/routines/{id}` | ✔ | 내 목표 삭제 | F-10 | ✅ |
| 28 | PATCH | `/routine-tasks/{id}` | ✔ | 완료 체크 | F-10 | ✅ |
| 29 | GET | `/notifications/settings` | ✔ | 알림 설정 조회 | F-11 | ✅ |
| 30 | PATCH | `/notifications/settings` | ✔ | 알림 설정 변경 | F-11 | ✅ |
| 31 | POST | `/notifications/device-tokens` | ✔ | 푸시 토큰 등록 | F-11 | ✅ |
| 32 | DELETE | `/analyses` | ✔ | **내 분석 전체 삭제** | F-13 | ✅ |
| 32-1 | GET | `/results/{id}/product-recommendation` | ✔ | **어울리는 상품 추천** (V14) | F-07 | ✅ |
| 33 | GET | `/subscriptions/me` | ✔ | 구독·분석권 상태 | F-12 | ✅ |
| 33-1 | POST | `/subscriptions/subscribe` | ✔ | **유료 전환 (결제 없음 · 즉시 활성화)** | F-12 | ✅ |
| 34 | POST | `/subscriptions/checkout` | ✔ | 결제 시작 | F-12 | 🚧 |
| 35 | POST | `/subscriptions/webhook` | — | PG 웹훅 (서버 전용) | F-12 | 🚧 |
| 36 | GET | `/consents/terms` | — | 약관 목록 | §10 | 🚧 |

✅ 구현됨 · 🚧 **아직 구현되지 않음** — 문서에만 있다.

> **🚧를 표에서 지우지 않은 이유** — 지우면 계획이 사라진다. 다만 그대로 두면
> 문서가 없는 것을 약속하는 꼴이라 표시를 붙였다. **결제(34~35)는 여전히 범위 밖**이고,
> 약관 전문(36)은 지금 화면에 체크박스와 한 줄 설명만 있다.
>
> 🔴 **33-1은 결제를 거치지 않는다.** 누르면 그 자리에서 유료로 바뀐다. PG가 붙으면
> 이 엔드포인트를 없애고 34 → PG → 35에서 같은 전환을 부르게 옮긴다.
> (AGENTS.md §4 · 2026-08-19 결정)

---

## 6. 엔드포인트 상세

### 6.1 인증

#### `POST /auth/signup`

```json
// Request
{
  "email": "user@example.com",
  "password": "Passw0rd!",
  "nickname": "멋쟁이 사자",
  "birthDate": "2000-01-31",
  "agreedConsents": ["TERMS", "PRIVACY", "BIOMETRIC", "MARKETING"]
}
```

**`birthDate`와 `agreedConsents`는 필수다.** 만 14세 **미만**은 가입할 수 없고
(`PROFILE_UNDERAGE`), 필수 동의가 빠지면 거절된다(`CONSENT_REQUIRED`).

| 동의 코드 | 필수 | 내용 |
| --- | --- | --- |
| `TERMS` | ✔ | 서비스 이용약관 |
| `PRIVACY` | ✔ | 개인정보 수집·이용 |
| `BIOMETRIC` | ✔ | 얼굴 사진·건강 정보(**민감정보**) |
| `MARKETING` | — | 마케팅 정보 수신. 거부해도 가입된다 |

> 만 14세 **당일은 가입할 수 있다.** 법이 제한하는 것은 만 14세 미만이다.
> 서버는 `agreedConsents`에 없는 항목을 **거부로 기록한다.** "물어봤는데 거부"와
> "아직 안 물어봄"을 구분하기 위해서다.

```json
// 201
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 1800,
    "user": {
      "id": "0f8c...",
      "email": "user@example.com",
      "nickname": "멋쟁이 사자",
      "provider": "LOCAL"
    }
  }
}
```

- `expiresIn`은 accessToken의 유효 시간(초)이다. 프론트는 이 값으로 갱신 시점을 잡는다.
- 가입 시 `TRIAL` 구독과 **분석권 1회**가 자동 생성된다.
- **이메일은 소문자로 정규화**된다. `A@x.com`과 `a@x.com`은 같은 계정이며, 두 번째 가입은 `409 AUTH_EMAIL_DUPLICATED`.
- `POST /auth/login` · `POST /auth/refresh`도 **같은 형식**을 반환한다.

#### `POST /auth/oauth/google`

프론트가 Google에서 받은 **ID 토큰**을 그대로 보낸다. 서버가 서명·발급자·audience·만료를 검증한다.

```json
// Request — 기존 계정 로그인
{ "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..." }

// Request — 최초 로그인(= 회원가입)
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
  "birthDate": "2000-01-31",
  "agreedConsents": ["TERMS", "PRIVACY", "BIOMETRIC"]
}
```

응답은 `POST /auth/login`과 **동일한 형식**이다. 프론트는 로그인 방식에 따라 분기하지 않는다.

**계정 식별 규칙** — 아래 순서로 조회하고, 없으면 새로 만든다.

| 순서 | 기준 | 결과 |
| --- | --- | --- |
| 1 | `(provider=GOOGLE, providerUserId=sub)` | 기존 Google 계정으로 로그인 |
| 2 | `email` | **같은 이메일의 기존 계정으로 로그인** |
| 3 | 없음 | 신규 생성 (`provider=GOOGLE`, `passwordHash=null`) |

> **3번은 회원가입이다.** 그래서 `POST /auth/signup`과 똑같이 나이·동의가 필요하다.
> 기존 계정(1·2번)이면 `birthDate`·`agreedConsents`는 무시된다. 신규인데 비어 있으면
> `CONSENT_REQUIRED`로 거절하므로, 프론트는 이 코드를 받으면 가입 화면에서 받아
> 다시 호출한다. 이 검사가 없으면 **동의 없이 계정이 만들어진다.**

> **이메일 기준 1계정이다.** 이메일로 가입한 뒤 같은 이메일로 Google 로그인하면 새 계정이 생기지 않고 기존 계정에 로그인된다. 반대로 Google로 먼저 가입하면 `passwordHash`가 `null`이라 이메일 로그인은 불가하다. 비밀번호 설정 기능은 현재 범위 밖이다.

#### `GET /users/me` — 라우팅 분기 기준

```json
{
  "success": true,
  "data": {
    "id": "0f8c...",
    "nickname": "멋쟁이 사자",
    "provider": "GOOGLE",
    "joinedAt": "2024-03-01T00:00:00Z",
    "hasProfile": true,
    "analysisCredits": 1,
    "subscription": { "plan": "TRIAL", "status": "ACTIVE", "expiresAt": "2026-09-10T00:00:00Z" }
  }
}
```

| `hasProfile` | 이동 화면 |
| --- | --- |
| `false` | 04 홈(프로필 무) → 사진 등록 유도 |
| `true` | 04 홈(프로필 유) |

---

### 6.2 업로드

#### `POST /uploads/presigned`

이미지는 서버를 거치지 않고 **스토리지에 직접 PUT**한다.

```json
// Request
{ "purpose": "PROFILE_PHOTO", "contentType": "image/jpeg", "contentLength": 2481920 }
```

`purpose`: `PROFILE_PHOTO` | `REFERENCE_IMAGE` | `INBODY_DOCUMENT`

**허용 `contentType`** — `image/jpeg` · `image/png` · `image/heic` · `image/webp`. 그 외는 `400 VALIDATION_ERROR`이며 URL을 발급하지 않는다.

```json
// 200
{
  "success": true,
  "data": {
    "uploadUrl": "https://storage.../a1b2.jpg?X-Amz-Signature=...",
    "objectKey": "profiles/0f8c.../a1b2.jpg",
    "expiresIn": 300
  }
}
```

**프론트 절차** — ① MediaPipe 1차 검증 → ② presigned 발급 → ③ `uploadUrl`에 PUT → ④ `objectKey`를 이후 API에 전달

- 조회용 이미지 URL은 **10분 만료**다. 캐시하거나 저장하지 않는다.

---

### 6.3 프로필

#### `POST /profiles`

시안 05~08의 단일 폼이 한 번에 제출된다.

```json
// Request
{
  "photoKey": "profiles/0f8c.../a1b2.jpg",
  "priorities": ["SKIN", "HEALTH", "BODY"],
  "heightCm": 150,
  "weightKg": 47.0,
  "sleepHours": 6.5,
  "inbody": {
    "bodyWaterL": 32.5, "proteinKg": 8.7, "mineralKg": 3.1,
    "bodyFatKg": 14.2, "skeletalMuscleKg": 24.1, "bmi": 19.5
  }
}
```

| 필드 | 필수 | 검증 |
| --- | --- | --- |
| photoKey | ✔ | presigned로 발급된 key만 허용 |
| **priorities** | ✔ | **길이 3, `SKIN`·`BODY`·`HEALTH` 각 1회, 중복 불가.** 배열 순서 = 1·2·3순위 |
| heightCm | ✔ | 100~250 |
| weightKg | ✔ | 30~200 |
| sleepHours | — | 0~14, 0.5 단위 |
| inbody | — | 6개 항목 각각 선택. 일부만 채워도 됨 |

> **`birthDate` / `gender`는 현재 요청에 없다.** 입력 화면이 미설계이기 때문이다(PRD O-2). 화면 확정 후 필수 필드로 추가하고 `PROFILE_UNDERAGE` 검증을 활성화한다.

```json
// 201
{
  "success": true,
  "data": {
    "profileId": "7a2e...",
    "photoUrl": "https://storage.../a1b2.jpg?X-Amz-Signature=...",
    "priorities": ["SKIN", "HEALTH", "BODY"],
    "heightCm": 164,
    "weightKg": 52.4,
    "sleepHours": 6.5,
    "inbody": {
      "bodyWaterL": 32.5, "proteinKg": 8.7, "mineralKg": 3.1,
      "bodyFatKg": 14.2, "skeletalMuscleKg": 24.1, "bmi": 19.5
    },
    "analysisSummary": null,
    "createdAt": "2026-08-14T03:50:00Z"
  }
}
```

`GET /profiles/me` · `PATCH /profiles/me` · `PATCH /profiles/me/priorities`도 **같은 형식**을 반환한다.

- **`analysisSummary`는 프로필 생성 직후 비동기로 채워진다.** 그전까지는 `null`이고, AI 분석이 실패해도 `null`로 남는다 — 가짜 값을 넣지 않는다. 프로필 등록 자체는 성공이므로 프론트는 이 값이 없어도 동작해야 한다.
  ```json
  { "faceImpression": ["차분한 눈매", "부드러운 얼굴선", "담백한 인상"],
    "bodyRange": "표준 범위",
    "healthNotes": ["평균 수면 6.5시간 · 사용자 입력 기준"],
    "capture": { "readability": "PARTIAL", "issues": ["DARK"] },
    "modelVersion": "gpt-5.4", "analyzedAt": "2026-08-14T04:12:00Z" }
  ```
- **`capture`는 사진을 얼마나 읽을 수 있었는지**를 말한다. **사진에 대한 판정이지 사용자에 대한 판정이 아니다.**
  - `readability` — `CLEAR`(세부까지 보였다) · `PARTIAL`(일부는 확실하지 않다) · `LIMITED`(제대로 보기 어려웠다)
  - `issues` — `DARK` · `BACKLIT` · `BLURRY` · `FACE_TOO_SMALL` · `OCCLUDED` · `HEAVY_FILTER` · `MULTIPLE_FACES` · `NO_FACE`. 없으면 빈 배열이다.
  - 🔴 **이 값을 화면에 그대로 내보내지 않는다.** `LIMITED`를 띄우면 사용자는 자기가 평가받았다고 읽는다(G-1). 프론트는 상태가 아니라 **무엇을 다시 하면 되는지**를 문장으로 말한다 — 문구 표는 `frontend/src/lib/capture.ts`에 있다.
  - **자유 서술 필드를 두지 않았다.** AI에게 문장을 짓게 하면 사용자 노출 텍스트가 하나 늘고 그만큼 가드레일 표면이 넓어진다. AI는 분류만 하고 말은 코드가 한다.
  - 이 필드가 생기기 전에 만들어진 프로필에는 **없다**(JSONB라 마이그레이션 없이 늘렸다). **없는 것을 "문제 없음"과 같이 다룬다** — 안내를 띄우지 않는다.
  - `NO_FACE`·`MULTIPLE_FACES`는 업로드 단계의 `ProfilePhotoValidator`가 이미 막는다. AI 쪽 판정은 그 얼굴 탐지가 오탐했을 때를 위한 **뒷받침**이다.
- `photoUrl`은 사진을 삭제하면 `null`이 된다.
- **`priorities` 검증** — 정확히 3개, 중복 없이, `SKIN`·`BODY`·`HEALTH` 전부. 어긋나면 `400 VALIDATION_ERROR`.
- **`photoKey` 소유 검증** — 다른 사용자의 key를 보내면 `403 FORBIDDEN_RESOURCE`.
- **응답에 점수·등급 필드는 없다.** 프론트도 임의 환산 UI를 만들지 않는다.

#### `GET /profiles/me`

시안 11 프로필 화면 데이터.

```json
{
  "success": true,
  "data": {
    "profileId": "7a2e...",
    "photoUrl": "https://storage.../...",
    "heightCm": 150, "weightKg": 47.0, "sleepHours": 6.5,
    "inbody": { "bodyWaterL": 32.5, "proteinKg": 8.7, "mineralKg": 3.1,
                "bodyFatKg": 14.2, "skeletalMuscleKg": 24.1, "bmi": 19.5 },
    "priorities": ["SKIN", "HEALTH", "BODY"]
  }
}
```

**표시 규칙** — `bmi`는 **무단위**다. 다른 항목과 달리 단위 접미를 붙이지 않는다.

#### `PUT /profiles/me/photo` 〔v3 신규〕

시안 11의 "사진 변경". **사진만 바꾼다.**

```json
// Request
{ "photoKey": "profile/7a2e.../9c1b....jpg" }
```

응답은 `GET /profiles/me`와 같은 `ProfileResponse`다.

- 🔴 **`POST /profiles`를 쓰지 않는 이유** — 그것은 우선순위·키·체중을 모두 요구한다.
  사진 한 장을 바꾸려고 신체 정보를 처음부터 다시 입력해야 했다.
- **새 프로필 행을 만들지 않는다.** 활성 프로필의 사진만 교체한다.
- 얼굴 인식·형식 검증은 `POST /profiles`와 **똑같이** 거친다. 건너뛰면 촬영 품질
  게이트를 우회하는 뒷문이 된다.
- 이전 사진 객체는 **즉시 삭제**된다. (PRD §10)
- 사진이 바뀌면 프로필 요약을 다시 만든다 — 요약이 사진을 보고 쓰이기 때문이다.
- 프로필이 없으면 `409 PROFILE_REQUIRED`.

#### `PATCH /profiles/me/priorities`

시안 11의 "우선 순위 변경".

```json
// Request
{ "priorities": ["HEALTH", "SKIN", "BODY"] }
```

- 변경해도 **기존 분석 결과는 재생성되지 않는다.** 이후 새 분석부터 적용된다.

#### `POST /profiles/inbody/scan` 〔v2 신규〕

시안 08의 "카메라로 서류 스켄하기".

```json
// Request
{ "documentKey": "inbody/0f8c.../doc1.jpg" }
```

```json
// 200
{
  "success": true,
  "data": {
    "extracted": {
      "bodyWaterL": 32.5, "proteinKg": 8.7, "mineralKg": 3.1,
      "bodyFatKg": 14.2, "skeletalMuscleKg": 24.1, "bmi": 19.5
    },
    "confidence": "HIGH",
    "unrecognized": ["mineralKg"]
  }
}
```

**중요** — 이 응답은 **입력 폼을 채우는 용도일 뿐 저장되지 않는다.** 사용자가 값을 확인·수정한 뒤 `POST /profiles` 또는 `PATCH /profiles/me`로 저장해야 반영된다. (PRD G-8)

- `unrecognized`에 포함된 항목은 프론트가 빈 칸으로 두고 직접 입력을 유도한다.
- 인식 실패 시 `422 INBODY_SCAN_FAILED`. 분석권은 차감하지 않는다.

---

### 6.4 고점 분석

#### `POST /analyses`

```json
// Request
{
  "inputText": "자연스럽고 건강해 보이는 분위기, 깔끔하고 단정한 인상",
  "referenceImageKeys": ["references/0f8c.../c3d4.jpg", "references/0f8c.../c3d5.jpg"]
}
```

| 필드 | 필수 | 비고 |
| --- | --- | --- |
| inputText | ✔ | **10~500자** |
| referenceImageKeys | — | **배열.** 빈 배열/생략 가능. 첨부 시 비교 이미지가 생성된다 |

> `priorityCategory`와 `inputMode`는 **삭제됐다.** 우선순위는 프로필에서 자동으로 가져오고, 입력 방식은 `referenceImageKeys` 유무로 판단한다.

```json
// 202
{ "success": true, "data": { "analysisId": "b91d...", "status": "EXTRACTING", "pollAfterMs": 2000 } }
```

- 사전 조건: 활성 프로필 없으면 `409 PROFILE_REQUIRED`, 분석권 0이면 `402 NO_ANALYSIS_CREDIT`.
- **분석권은 이 시점에 차감하지 않는다.** 결과 생성 성공 시 차감한다.

#### `GET /analyses/{id}` — 상태 폴링

```json
{
  "success": true,
  "data": {
    "analysisId": "b91d...",
    "status": "KEYWORDS_READY",
    "imageStatus": "PENDING",
    "progress": 45,
    "message": "고점 키워드를 찾고 있어요",
    "failureCode": null,
    "pollAfterMs": 2000
  }
}
```

| status | 프론트 동작 |
| --- | --- |
| `CREATED` `EXTRACTING` | 13 분석 중 화면 유지 |
| `KEYWORDS_READY` | **폴링 유지** + 14 키워드 오버레이 카드 노출 |
| `GENERATING` | 15 분석 중 화면 유지 |
| `DONE` | 폴링 중단 → 16 완료 화면 → 5초 후 17 결과지 |
| `FAILED` | 폴링 중단 → `failureCode` 기반 에러 UI |

> **v1과 달라진 점** — `KEYWORDS_READY`에서 폴링을 멈추지 않는다. 시안 14는 **분석이 계속 진행되는 동안** 키워드를 선택하는 구조이므로, 프론트는 오버레이 카드를 띄운 채 폴링을 유지한다.

- 폴링 상한 **60초**. 초과 시 중단하고 `ANALYSIS_TIMEOUT` UI.
- `status = DONE` 이후에도 `imageStatus`가 `PENDING`일 수 있다. 결과 화면을 먼저 그리고 이미지 자리에 스켈레톤을 유지한 뒤 폴링해 교체한다.

#### `GET /analyses/{id}/keywords`

```json
{
  "success": true,
  "data": {
    "analysisId": "b91d...",
    "minSelect": 1,
    "maxSelect": 4,
    "keywords": [
      { "id": "k1", "label": "다이아몬드형", "reason": "얼굴선 비율에서 도출했어요.", "category": "FACE", "displayOrder": 1 },
      { "id": "k2", "label": "귀족턱",       "reason": "입력하신 '단정한 인상'과 연결돼요.", "category": "FACE", "displayOrder": 2 },
      { "id": "k3", "label": "17호 피부",     "reason": "사진의 피부 톤 범위예요.", "category": "SKIN", "displayOrder": 3 },
      { "id": "k4", "label": "큰 눈",         "reason": "'또렷한 인상'에서 도출했어요.", "category": "FACE", "displayOrder": 4 }
    ]
  }
}
```

**프론트 규칙**

- 모든 키워드는 **미선택 상태로 시작**한다. AI 추천을 기본 체크하지 않는다.
- `minSelect` 미만이면 "키워드 선택 저장하기" 버튼을 `disabled` 처리한다. (PRD R-3 — 현재 시안에 미반영이므로 구현 시 추가)

#### `POST /analyses/{id}/keywords/selection`

```json
// Request
{ "keywordIds": ["k1", "k3", "k4"] }
// 202
{ "success": true, "data": { "analysisId": "b91d...", "status": "GENERATING", "pollAfterMs": 3000 } }
```

`status != KEYWORDS_READY`면 `409 ANALYSIS_INVALID_STATE`. 개수가 1~4를 벗어나면 `400 VALIDATION_ERROR`.

#### `GET /analyses/{id}/result` — 결과 화면

**응답의 키 순서가 결과 화면 블록 순서와 같다.**

```json
{
  "success": true,
  "data": {
    "resultId": "r55a...",
    "analysisId": "b91d...",
    "viewState": "FRESH",
    "title": "17호, 큰 눈, 귀족턱, 다...",
    "analyzedAt": "2026-08-12T04:12:00Z",

    "comparisonImage": {
      "status": "DONE",
      "currentUrl": "https://storage.../current.png?X-Amz-Signature=...",
      "peakUrl":    "https://storage.../peak.png?X-Amz-Signature=..."
    },

    "overview": {
      "summary": "사용자가 구성한 정보 중심으로 된 요약이에요.",
      "keywords": [
        { "id": "k1", "label": "다이아몬드형", "selected": true },
        { "id": "k3", "label": "17호 피부",   "selected": true },
        { "id": "k4", "label": "큰 눈",       "selected": true }
      ],
      "keepPoints":      ["부드러운 얼굴선", "입매"],
      "emphasizePoints": ["부드러운 얼굴선", "입매"],
      "changeIntensity": ["부드러운 얼굴선", "입매"]
    },

    "categoryChanges": [
      { "category": "SKIN",   "description": "체수분 수치가 낮고 사진상 모공이 도드라져 수분 섭취가 필요해 보여요. 광택을 과하게 더하기 보단 피부톤을 균일하게 유지해보세요" },
      { "category": "BODY",   "description": "..." },
      { "category": "HEALTH", "description": "..." }
    ],

    "dailyCares": [
      { "title": "수분 진정 루틴", "description": "아침에는 자외선 관리, 저녁에는 보습 단계를 단순하게 유지해 보세요." },
      { "title": "눈썹과 헤어 라인 정돈", "description": "..." },
      { "title": "수면 시간 안정화", "description": "..." }
    ],

    "saved": false,
    "disclaimer": "AI가 생성한 참고용 이미지와 관리 방향입니다. 피부·건강 상태에 대한 의료적 진단이나 시술 결과를 의미하지 않습니다."
  }
}
```

**`viewState`에 따른 프론트 분기**

| | `FRESH` | `SAVED` |
| --- | --- | --- |
| 키워드 칩 | **체크박스형** (조정 가능) | **pill형** (확정) |
| CTA | `서랍에 결과 저장하기` primary<br>`새로 분석하기` outline | `맞춤형 목표로 설정하기` primary |
| 활성 탭 | 홈 | 서랍 |

**이미지 상태별 처리**

| `comparisonImage.status` | 처리 |
| --- | --- |
| `SKIPPED` | 비교 슬라이더 **미렌더링** (참고 사진 미첨부) |
| `PENDING` | 스켈레톤 + `GET /analyses/{id}` 폴링 계속 |
| `DONE` | 비교 슬라이더 렌더링 (`currentUrl` 좌 / `peakUrl` 우) |
| `FAILED` | "예상 이미지는 생성하지 못했어요" 안내, 나머지 결과는 정상 노출 |

**필수 규칙**

- `disclaimer`는 **항상 노출**한다. 숨기거나 접을 수 없다. 이 문구가 없는 결과 화면은 배포 불가다. (PRD F-07)
- `categoryChanges`는 **항상 3건**이며, 배열 순서는 `profiles.priorities` 순서를 따른다.
- `changeIntensity`는 **텍스트 배열**이다. 퍼센트 게이지 UI를 만들지 않는다.

> **`새로 분석하기` 버튼은 `outline`으로 구현한다.** 시안은 `danger`(코랄)로 되어 있으나, 재분석은 프로필이 유지되는 비파괴 동작이므로 삭제 버튼과 같은 색을 쓰지 않는다. ([design.md](design.md) §5.4)

#### `POST /analyses/{id}/result/save`

시안 17의 "서랍에 결과 저장하기".

```json
// 200
{ "success": true, "data": { "savedResultId": "s12a...", "savedAt": "2026-08-12T04:20:00Z" } }
```

- 저장 후 18 저장 안내를 거쳐 홈으로 이동한다.
- **자동 저장은 없다.** (PRD R-4)
- "새로 분석하기"는 별도 API가 없다. 프론트가 12 고점 등록 화면으로 이동해 `POST /analyses`를 새로 호출하며, 서버가 `retriedFrom`을 기록한다. **프로필은 유지되므로 사진 재등록 화면으로 보내지 않는다.** (PRD R-1)

#### `DELETE /analyses/{id}` 〔v3 신규〕

진행 중인 분석 **버리기**. `204`.

- 🔴 **이것이 없으면 빠져나갈 길이 없다.** 키워드를 고르다 화면을 벗어난 분석은
  `KEYWORDS_READY`로 남고, 좀비 스위퍼는 이 상태를 **일부러 건드리지 않는다**
  (사용자가 고르는 중일 수 있다). 그 뒤로 `POST /analyses`가 전부
  `409 ANALYSIS_INVALID_STATE`로 막힌다.
- 지우지 않고 `FAILED`(`failureCode: "ANALYSIS_CANCELED"`)로 내린다.
- **분석권은 차감되지 않는다** — 결과를 받지 못했다.
- 이미 끝난(`DONE`·`FAILED`) 분석에 불러도 `204`다. 결과를 덮어쓰지 않는다.

#### `DELETE /analyses`

시안 11의 "내 분석 전체 삭제". `204`. 확인 모달을 거친 뒤 호출한다.

---

### 6.5 서랍

#### `GET /saved-results`

**3개 섹션을 한 번에 내려준다.** (시안 19)

```json
{
  "success": true,
  "data": {
    "inProgress": [
      { "savedResultId": "s12a...", "resultId": "r55a...",
        "thumbnailUrl": "https://storage.../thumb.png?X-Amz-Signature=...",
        "title": "17호, 큰 눈, 귀족턱, 다...", "analyzedAt": "2026-08-10T00:00:00Z",
        "progressRate": 62.5 }
    ],
    "recent": [ ],
    "all":    [ ]
  }
}
```

| 섹션 | 화면 문구 | 판정 |
| --- | --- | --- |
| `inProgress` | 현재 진행중인 목표 | 진행 중(`ACTIVE`) 목표가 연결된 결과 |
| `recent` | 최근 분석 결과 | 저장 후 1개월 이내 |
| `all` | 전체 | 전부 |

- `thumbnailUrl`은 이미지가 없는 결과(`SKIPPED`·`FAILED`)에서 `null`이다. 프론트는 GO. 브랜드 placeholder를 노출한다.
- `progressRate`는 연결된 목표의 태스크 완료율이다. 목표가 없으면 `null`.

#### `GET /saved-results/{id}`

`GET /analyses/{id}/result`와 **동일한 스키마**를 반환하되 `viewState`가 `SAVED`다. 프론트는 결과 화면 컴포넌트를 재사용한다.

#### `DELETE /saved-results/{id}` — `204`

---

### 6.6 목표

#### `POST /routines` — **경로 2종** (PRD F-09)

`sourceType`으로 분기한다.

**경로 A — 저장된 분석 결과 가져오기**

시안 20의 "맞춤형 목표로 설정하기", 그리고 루틴 탭 → 결과 선택이 이 경로다.

```json
// Request
{
  "sourceType": "FROM_ANALYSIS",
  "sourceAnalysisResultId": "r55a...",
  "startDate": "2026-08-14"
}
```

- 카테고리·기간 파라미터는 없다. AI가 결과와 `profiles.priorities`를 근거로 자동 생성한다.
- 여러 카테고리에 걸친 **목표 1개**가 만들어진다.

**경로 B — 새 루틴 만들기**

```json
// Request
{
  "sourceType": "STANDALONE",
  "startDate": "2026-08-14",
  "items": [
    { "category": "SKIN",   "durationWeeks": 4 },
    { "category": "HEALTH", "durationWeeks": 3 }
  ]
}
```

| 필드 | 검증 |
| --- | --- |
| items | **1~3개**, `category` 중복 불가 |
| durationWeeks | **1~52** · 카테고리별 하한이 따로 있다 (아래) |
| startDate | 오늘 이후 |

- **카테고리당 목표 1개**가 만들어진다. 위 예시는 목표 2개를 생성한다.

**카테고리별 최소 기간** 〔2026-08-17 팀 결정〕 — 변화가 눈에 보이기까지 걸리는 시간이 달라 하한을 다르게 둔다. 미만이면 `400 VALIDATION_ERROR`.

| 카테고리 | 최소 | 프론트 기본값 |
| --- | --- | --- |
| `SKIN` | **24주 (6개월)** | 6개월 |
| `BODY` | **4주 (1개월)** | 1개월 |
| `HEALTH` | 1주 (하한 없음) | 1개월 |

- 화면은 **개월** 단위로 고르게 하고 `1개월 = 4주`로 환산해 보낸다.
- 구현: 상한은 DB `CHECK`(V8), 하한은 애플리케이션 `RoutinePolicy`가 갖는다. 하한은 정책이라 바뀔 수 있어 스키마에 굳히지 않았다.
- ⚠️ **기간이 길면 태스크가 많아진다.** 서버는 AI가 만든 한 주치 구성을 **기간 안의 날짜마다** 펼친다(V15). 4주 × 6개 = 168개, 6개월 × 4개 = 672개. 프론트는 전부 그리지 말고 **그날 것만** 보여준다 — 홈·루틴 화면은 오늘, 캘린더는 고른 날짜다.
- 🔴 **`weeklyTarget`이 있으면 그 주에 몇 번 하면 되는지를 뜻한다.** 주 3회짜리도 그 주의 **모든 날**에 배정이 있고, 그중 3개를 체크하면 그 주가 채워진 것이다. 어느 요일에 할지는 서버가 정하지 않는다 — 월·수·금으로 박으면 월요일에 못 한 사람이 회차를 영영 잃는다. `null`이면 매일 하는 일이라 그날 한 번으로 끝난다.
- 🔴 **`progress`는 행을 세지 않는다.** 주 N회는 행이 7개여도 해야 하는 것은 N번뿐이라, 행으로 세면 진행률이 100%에 영영 닿지 않는다. (목표·태스크·주)마다 목표는 N, 완료는 그 주의 완료 수를 N으로 상한한 값이다.
- **`timing`은 사용자가 읽는 말이고, 실제 배정은 AI가 준 `frequencyPerWeek`(숫자)로 만든다.** "주 3회"를 한글에서 파싱하지 않는다.
- ⚠️ **`timing`은 언제나 시점 하나다.** 하루에 두 번 하는 일은 서버가 **태스크를 두 개로 나눈다** — 완료 체크가 태스크 단위라, `"아침, 저녁"`이 한 줄이면 아침만 한 상태를 표현할 수 없다. 나누는 만큼 `taskCount`가 늘어난다(실측: 6개월 피부 목표에서 세안·보습이 아침/저녁으로 갈려 **120개**).

**공통 응답**

```json
// 201
{
  "success": true,
  "data": {
    "routines": [
      {
        "routineId": "rt01...",
        "sourceType": "STANDALONE",
        "category": "SKIN",
        "title": "피부·수분 균형 루틴",
        "durationWeeks": 4,
        "startDate": "2026-08-14",
        "endDate": "2026-09-10",
        "taskCount": 168
      }
    ]
  }
}
```

- 경로 A는 `routines` 배열에 항상 **1개**가 담기며 `category`·`durationWeeks`·`endDate`가 `null`이다.
- 경로 B는 `items` 개수만큼 담긴다.

**GET /saved-results 와의 관계** — 경로 A의 결과 선택 목록은 `GET /saved-results`의 `all` 섹션을 재사용한다. 별도 엔드포인트를 두지 않는다. 목록이 비어 있으면 프론트는 경로 B로 유도한다. (PRD R-5)

#### `GET /routines/{id}`

시안 23 목표 화면 데이터.

```json
{
  "success": true,
  "data": {
    "routineId": "rt01...",
    "sourceType": "FROM_ANALYSIS",
    "category": null,
    "durationWeeks": null,
    "title": "17호, 큰 눈, 귀족턱, 다...",
    "analyzedAt": "2026-08-12T00:00:00Z",
    "overview": {
      "keywords": [{ "id": "k1", "label": "다이아몬드형" }, { "id": "k4", "label": "큰 눈" }],
      "keepPoints":      ["부드러운 얼굴선", "입매"],
      "emphasizePoints": ["부드러운 얼굴선", "입매"],
      "changeIntensity": ["부드러운 얼굴선", "입매"]
    },
    "progress": { "done": 2, "total": 5, "rate": 40.0 },
    "tasks": [
      {
        "taskId": "tk88...",
        "category": "SKIN",
        "title": "자외선 차단제 바르기",
        "timing": "매일 외출 전",
        "durationLabel": "약 2분",
        "amountLabel": "4ml",
        "scheduledDate": "2026-08-14",
        "status": "DONE"
      }
    ],
    "notification": { "enabled": true, "time": "21:00" }
  }
}
```

**Task Card 표기** — `title` 아래에 `timing / durationLabel / amountLabel`을 ` / `로 연결해 한 줄로 표시한다.

`sourceType`이 `STANDALONE`이면 `overview`가 `null`이다(분석 결과가 없으므로). 프론트는 고점 요약 카드를 렌더링하지 않고 `category` + `durationWeeks`를 대신 표시한다.

#### `PATCH /routine-tasks/{id}`

```json
// Request
{ "status": "DONE" }
// 200
{ "success": true, "data": { "taskId": "tk88...", "status": "DONE",
                             "progress": { "done": 3, "total": 5, "rate": 60.0 } } }
```

- 완료 시 카드가 `surface-sunken` 배경으로 흐려진다. ([design.md](design.md) §4.3)
- 미수행 재배치는 **미구현**이다. `MISSED` 상태만 정의되어 있다. (PRD O-4)

### 6.9 상품 추천

#### `GET /results/{resultId}/product-recommendation`

분석 결과에 어울리는 상품. **AI가 고른다.** (피드백 11번 · V14)

```json
// 200
{ "success": true, "data": {
  "productIds": ["blue-repair-soothing-cream", "blue-repair-solution"],
  "reason": "붉은기와 세안 뒤 당김이 함께 보여 진정과 집중 보습을 함께 고려해 골랐어요."
} }
```

- **id만 돌려준다.** 사진·링크·설명은 화면이 갖고 있다(`frontend/src/data/products.ts`).
  서버가 모르는 id를 화면이 만나면 조용히 건너뛴다 — 추천이 줄어들 뿐 깨지지 않는다.
- **`productIds`가 빈 배열인 것도 정상 답이다.** 어울리는 것이 없으면 억지로 채우지
  않는다. 그때 화면은 성분 이야기로 대신한다.
- **첫 호출에만 AI를 부른다**(실측 3초). 이후에는 `product_recommendations` 캐시에서
  즉시 답한다(실측 0.1초). 결과지 하나에 대한 답은 바뀌지 않는다.
- 모델이 낸 id는 서버가 한 번 더 거른다 — 목록에 없는 id, 같은 상품의 다른 용량,
  3개 초과분을 버린다.
- 남의 결과는 `403`, 없는 결과는 `404`.

> **효능을 약속하는 말과 수치를 프롬프트에서 금지했다.** 카탈로그에도 시험 결과를
> 넣지 않는다 — 입력에 있으면 모델이 그것을 근거로 문장을 만든다. (PRD G-3)

---

#### `PATCH /routines/order`

목표 순서 변경. 루틴 화면에서 끌거나 ▲▼로 올리고 내린 결과를 저장한다.

```json
// Request — 화면에 보이는 순서 그대로, 전부 보낸다
{ "routineIds": ["7a2e...", "9b41...", "c0d3..."] }
```

응답은 `GET /routines`와 같은 `RoutineListResponse`다. 새 순서로 정렬돼 돌아오므로
프론트가 다시 조회하지 않아도 된다.

- **일부만 보내지 않는다.** 목록 전체를 순서대로 보낸다. 빠진 목표가 있으면 그
  목표의 자리를 서버가 정해야 하는데, 그 규칙을 사용자가 알 수 없다.
- 빈 배열은 `400`. 남의 목표 id가 섞이면 `403 FORBIDDEN_RESOURCE`.
- 🔴 **경로가 `/routines/{routineId}`보다 먼저 선언돼야 한다.** 뒤에 두면
  `order`가 `{routineId}`로 잡혀 UUID 파싱에서 `400`이 난다.

---

#### `PATCH /routines/{id}/notification`

목표별 알림 시각. (V12 · 회의 안건 5번)

```json
// Request — 이 목표만 07:30에 알린다
{ "notifyTime": "07:30" }
// Request — 정하지 않음으로 되돌린다 (기본 시각을 따른다)
{ "notifyTime": null }
// 200 — 갱신된 RoutineSummary
{ "success": true, "data": { "routineId": "rt77...", "notifyTime": "07:30", "…": "…" } }
```

- **`notifyTime`이 `null`이면 `/notifications/settings`의 `defaultTime`을 따른다.** 기본값을
  목표에 복사해 두지 않으므로, 나중에 기본 시각을 바꾸면 정하지 않은 목표는 함께 따라간다.
- **켜고 끄는 것은 여기 없다.** on/off는 사용자 단위로 `/notifications/settings`가 갖는다.
  목표마다 두면 "전체는 껐는데 목표는 켜져 있다"는 상태가 생긴다.
- `GET /routines/{id}`의 `notification.time`은 **실제로 적용되는 시각**이다 —
  목표에 값이 있으면 그것을, 없으면 기본 시각을 서버가 정해서 내려준다. 프론트가
  둘 중 무엇이 이기는지 계산하지 않는다.
- `notifyTime`은 `RoutineSummary`에도 실린다. `"HH:mm"`이고, 정하지 않았으면 `null` 키가 남는다.

#### `DELETE /routines/{id}`

시안 23의 "내 목표 삭제". `204`. 확인 모달(시안 00)을 거친다.

- 모달 문구: `삭제하시겠어요?` / `삭제한 내용은 복구할 수 없어요.` / `*계정, 목표 정보는 삭제되지 않아요.`
- 버튼 순서: `되돌아 가기`(primary) 위 → `삭제하기`(danger) 아래

---

### 6.7 알림

#### `GET` / `PATCH /notifications/settings`

```json
{ "enabled": true, "defaultTime": "21:00" }
```

기본값은 `enabled = false`. 최초 목표 생성 시 동의를 받고 켠다. 시안 23의 토글과 "알림 설정 상세"가 이 API를 쓴다.

#### `POST /notifications/device-tokens`

```json
{ "token": "ExponentPushToken[xxxxxxxx]", "platform": "ANDROID" }
```

**Expo 푸시 토큰**이다. 같은 토큰을 다시 보내면 지금 사용자에게 옮겨 붙는다 —
기기 하나를 두 사람이 번갈아 쓰면 나중 사람에게 가야 한다.

프론트는 **알림을 켤 때** 등록한다. 앱을 열자마자 권한을 물으면 무엇에 쓰는지
모르는 상태에서 거절당하고, 거절한 권한은 기기 설정에서만 되돌릴 수 있다.

#### 발송 (서버 내부)

`RoutineNotificationSweeper`가 1분마다 돌며 **알림 시각이 지난 목표**를 보낸다.

| | |
| --- | --- |
| 적용 시각 | 목표의 `notifyTime`, 없으면 `defaultTime` (V12) |
| 대상 | `enabled = true` · `ACTIVE` · 기간 안 |
| 창(window) | 지난 **10분**까지. 그 1분에 서버가 멈춰도 그날 알림이 사라지지 않게 |
| 중복 방지 | `notification_sends(routine_id, sent_on)` UNIQUE (V13) |
| 묶음 | **사용자당 한 번.** 같은 시각 목표 셋이면 알림은 하나 |

> **알림 문구에 목표 이름도 태스크 이름도 넣지 않는다.** 푸시는 잠금 화면에 뜬다.
> 목표 이름은 AI가 짓고 "모공 정돈과 생활 리듬을 함께 다듬기"처럼 나올 수 있어,
> 그대로 띄우면 **남이 볼 수 있는 자리에 피부·건강 상태가 드러난다.** 얼굴 사진과
> 건강 정보를 민감정보로 따로 동의받는 서비스가(PRD G-1) 알림으로 흘리면 안 된다.
> 지금 문구는 `오늘의 루틴` / `고점으로 가는 오늘 할 일을 확인해보세요.`

> ⚠️ **`notify_time`은 DB에 UTC로 저장된다** (`hibernate.jdbc.time_zone: UTC`).
> DB를 직접 열면 화면과 9시간 달라 보인다 — 07:30 알림이 `22:30`으로 앉아 있다.
> 점검용 값을 psql로 직접 넣으면 이 변환을 거치지 않아 엉뚱한 시각이 된다.
> **알림 시각은 API로 넣는다.**

---

### 6.8 구독

#### `GET /subscriptions/me`

```json
{
  "success": true,
  "data": {
    "plan": "TRIAL", "status": "ACTIVE",
    "analysisCredits": 1,
    "unlimited": false,
    "expiresAt": "2026-09-10T00:00:00Z",
    "canAnalyze": true,
    "canCreateRoutine": true,
    "products": [
      { "plan": "MONTHLY", "amount": 8900,  "label": "월 구독" },
      { "plan": "YEARLY",  "amount": 89000, "label": "연 구독" }
    ]
  }
}
```

프론트는 `canAnalyze` / `canCreateRoutine`만 보고 게이팅한다. 만료·잔여 계산을 프론트에서 하지 않는다.

🔴 **`analysisCredits`는 무료 체험에서만 의미가 있다.** 유료 구독은 횟수를 세지 않으므로
`unlimited`를 봐야 한다 — 이 값을 안 보고 잔여 횟수를 그리면 **결제한 사용자에게
"0회 남음"**이 뜬다. 실제로 유료 전환 후에도 `analysisCredits`는 0인 채로 남는다.

#### `POST /subscriptions/subscribe`

```json
{ "plan": "MONTHLY" }
```

응답은 `GET /subscriptions/me`와 같은 형태다.

🔴 **결제를 거치지 않는다.** 부르면 그 자리에서 `plan`·`status`·`expiresAt`이 바뀌고
이후 분석이 무제한이 된다. 목업이 아니라 실제 상태 변경이다. `TRIAL`을 보내면
`VALIDATION_ERROR` — 무료 체험은 가입 시 자동 발급이지 고르는 값이 아니다.

| 요청 `plan` | 만료 |
| --- | --- |
| `MONTHLY` | 지금부터 1개월 |
| `YEARLY` | 지금부터 1년 |

> PG가 붙으면 이 엔드포인트를 없애고 34번(`/checkout`) → PG → 35번(`/webhook`)에서
> 같은 전환을 부르게 옮긴다. (AGENTS.md §4 · 2026-08-19 결정)

---

## 7. 부록 A — OpenAI 연동 규격 (백엔드 전용)

### 7.1 단계별 모델 매핑

| 단계 | 엔드포인트 | 모델 |
| --- | --- | --- |
| `PROFILE_ANALYSIS` | `/v1/chat/completions` | 멀티모달 텍스트 |
| **`INBODY_OCR`** | `/v1/chat/completions` | 멀티모달 텍스트 |
| `KEYWORD_EXTRACTION` | `/v1/chat/completions` | 멀티모달 텍스트 |
| `RESULT_GENERATION` | `/v1/chat/completions` | 멀티모달 텍스트 |
| `IMAGE_GENERATION` | `/v1/images/edits` | 이미지 |
| `ROUTINE_GENERATION` | `/v1/chat/completions` | 멀티모달 텍스트 |

- **모델 ID를 하드코딩하지 않는다.** `openai.model.text` / `openai.model.image` 설정으로 핀 고정하고 실제 사용값을 `ai_jobs.model`에 기록한다.
- 모든 텍스트 단계는 `response_format: { "type": "json_schema", "json_schema": { "strict": true, ... } }`. **자유 서술 파싱 금지.**
- API 키는 서버 환경변수(`OPENAI_API_KEY`)로만 관리한다. **프론트에서 직접 호출하지 않는다.**

### 7.2 Schema — 키워드 추출

```json
{
  "name": "keyword_extraction",
  "strict": true,
  "schema": {
    "type": "object", "additionalProperties": false, "required": ["keywords"],
    "properties": {
      "keywords": {
        "type": "array", "minItems": 5, "maxItems": 8,
        "items": {
          "type": "object", "additionalProperties": false,
          "required": ["label", "reason", "category"],
          "properties": {
            "label":    { "type": "string", "maxLength": 40 },
            "reason":   { "type": "string", "maxLength": 120 },
            "category": { "type": "string", "enum": ["SKIN", "FACE", "BODY", "HEALTH"] }
          }
        }
      }
    }
  }
}
```

### 7.3 Schema — 결과 생성

```json
{
  "name": "peak_result",
  "strict": true,
  "schema": {
    "type": "object", "additionalProperties": false,
    "required": ["title", "summary", "keepPoints", "emphasizePoints",
                 "changeIntensity", "categoryChanges", "dailyCares"],
    "properties": {
      "title":   { "type": "string", "maxLength": 60 },
      "summary": { "type": "string", "maxLength": 120 },
      "keepPoints":      { "type": "array", "minItems": 1, "maxItems": 3, "items": { "type": "string", "maxLength": 30 } },
      "emphasizePoints": { "type": "array", "minItems": 1, "maxItems": 3, "items": { "type": "string", "maxLength": 30 } },
      "changeIntensity": { "type": "array", "minItems": 1, "maxItems": 3, "items": { "type": "string", "maxLength": 30 } },
      "categoryChanges": {
        "type": "array", "minItems": 3, "maxItems": 3,
        "items": {
          "type": "object", "additionalProperties": false,
          "required": ["category", "description"],
          "properties": {
            "category":    { "type": "string", "enum": ["SKIN", "BODY", "HEALTH"] },
            "description": { "type": "string", "maxLength": 200 }
          }
        }
      },
      "dailyCares": {
        "type": "array", "minItems": 3, "maxItems": 3,
        "items": {
          "type": "object", "additionalProperties": false,
          "required": ["title", "description"],
          "properties": {
            "title":       { "type": "string", "maxLength": 30 },
            "description": { "type": "string", "maxLength": 150 }
          }
        }
      }
    }
  }
}
```

- `categoryChanges` 3건은 **`SKIN`·`BODY`·`HEALTH` 각 1건**이어야 한다. 스키마로 강제되지 않으므로 서버가 검증한다.
- 배열 순서를 `profiles.priorities` 순서에 맞춰 정렬한 뒤 저장한다.

### 7.4 Schema — 인바디 OCR 〔v2 신규〕

```json
{
  "name": "inbody_ocr",
  "strict": true,
  "schema": {
    "type": "object", "additionalProperties": false,
    "required": ["bodyWaterL", "proteinKg", "mineralKg", "bodyFatKg", "skeletalMuscleKg", "bmi"],
    "properties": {
      "bodyWaterL":       { "type": ["number", "null"] },
      "proteinKg":        { "type": ["number", "null"] },
      "mineralKg":        { "type": ["number", "null"] },
      "bodyFatKg":        { "type": ["number", "null"] },
      "skeletalMuscleKg": { "type": ["number", "null"] },
      "bmi":              { "type": ["number", "null"] }
    }
  }
}
```

- 읽지 못한 항목은 `null`로 반환하고 `unrecognized`에 담아 내려준다. **추측값을 채우지 않는다.**

### 7.5 시스템 프롬프트 필수 규칙

모든 텍스트 단계에 포함하고, 출력 후 서버가 재검증한다.

```text
- 외모를 점수·등급·순위로 평가하지 않는다. (G-1)
- 참고 이미지 속 인물의 **얼굴(이목구비·골격)**을 복제하지 않는다. 헤어스타일과 피부 상태는 합성 대상이다. (G-2)
- 의료 진단, 시술 권유, 효능 보장 표현을 하지 않는다. (G-3)
- 체중 목표를 수치로 단정하거나 극단적 식이·단식을 제안하지 않는다. (G-4)
- 사용자가 입력하지 않은 정보를 근거로 삼지 않으며, 근거에 참조한 입력을 명시한다. (G-5)
- 결점 중심으로 서술하지 않는다. "부족하다" 대신 "이렇게 하면 가까워진다"로 표현한다. (G-6)
- 인바디 수치를 읽지 못하면 추측하지 말고 null로 반환한다. (G-8)
```

**서버 후검증** — 응답에 점수 패턴(`\d+점`, `상위 \d+%`)이나 금지어(`치료`, `시술받`, `진단`)가 포함되면 1회 재생성하고, 재차 검출되면 `AI_PROVIDER_ERROR`로 처리한다. **프롬프트만으로 가드레일을 보장하지 않는다.**

### 7.6 이미지 생성

- 입력: **사용자 사진(주)** + 참고 사진 N장(보조) + 선택 키워드 기반 프롬프트
- 프롬프트에 합성 경계를 명시한다 — **참고 이미지에서 헤어스타일·피부 상태를 가져오되, 얼굴(이목구비·골격)과 피부색은 사용자 것을 유지**한다. (G-2 · PRD §8.2 표)
- 출력은 base64이므로 서버가 디코딩해 스토리지에 저장하고 `comparison_image_key`를 기록한다.
- **실제 인물 사진 편집은 제공자 정책에 의해 거부될 수 있다.** 거부 시 예외 처리하지 말고 `image_status = FAILED`로 저장한 뒤 텍스트 결과만 노출한다. 이 경로는 **정상 시나리오**다.
- 이미지 실패는 분석권 미차감 사유가 **아니다.** 텍스트 결과가 정상 생성되었으면 차감한다.
- 결과는 `currentUrl`(현재) / `peakUrl`(고점) 두 장으로 내려 비교 슬라이더가 좌우로 나눠 그린다.

---

## 8. 부록 B — 프론트 구현 체크리스트

| # | 항목 |
| --- | --- |
| C-1 | `GET /users/me`의 `hasProfile`로 최초 진입 라우팅을 분기한다 |
| C-2 | 이미지 업로드는 presigned URL 직접 PUT. 서버로 multipart를 보내지 않는다 |
| C-3 | 조회용 이미지 URL은 10분 만료다. 캐시·영구 저장하지 않는다 |
| C-4 | 분석 진행은 `GET /analyses/{id}` 단일 폴링 (상한 60초). **`KEYWORDS_READY`에서도 폴링을 멈추지 않는다** |
| C-5 | 키워드는 미선택 상태로 시작하고, 1개 미만이면 저장 버튼을 `disabled` 처리한다 |
| C-6 | 결과 화면에서 `disclaimer`를 상시 노출한다 (숨김·접기 금지) |
| C-7 | `comparisonImage.status` 4가지 분기를 모두 구현한다 |
| C-8 | `viewState`로 결과 화면의 칩 형태·CTA·활성 탭을 분기한다 |
| C-9 | "새로 분석하기"에서 사진 재등록 화면으로 보내지 않는다. `outline` 버튼으로 구현한다 |
| C-10 | `priorities`는 **배열 순서가 순위**다. 정렬을 바꾸지 않는다 |
| C-11 | `bmi`는 단위 접미를 붙이지 않는다 |
| C-12 | 인바디 OCR 결과는 **폼에 채우기만** 하고, 사용자 확인 후 저장 API를 호출한다 |
| C-13 | 점수·등급·순위 형태의 UI를 만들지 않는다 |
| C-14 | 루틴 탭은 **경로 2종 선택**부터 보여준다. 저장된 결과가 0개면 경로 A를 `disabled`로 두고 경로 B로 유도한다 |
| C-15 | `POST /routines` 응답은 항상 **배열**이다. 경로 B는 최대 3개가 한 번에 생성된다 |

---

## 9. 미결 사항

| # | 내용 | 확정 필요 |
| --- | --- | --- |
| A-1 | **홈 화면 수치 대시보드 API 미정의** — PRD O-1 정책 결정 전까지 설계하지 않는다 | M1 |
| A-2 | `birthDate` / `gender` 필드 — 입력 화면 확정 후 `POST /profiles`에 추가 (PRD O-2) | M2 |
| A-3 | 목표 생성 2경로의 **화면**이 미설계 (PRD O-4). API는 확정, UI 연결 대기 | M5 |
| A-4 | 미수행 재배치 API — `PATCH /routine-tasks/{id}` 응답에 `rescheduledTask` 추가 예정 (PRD O-9) | M5 |
| A-5 | PG사 확정 → `/subscriptions/checkout` 응답·웹훅 변경 가능 | M6 |
| A-6 | 알림 전송 수단(FCM vs Web Push) | M6 |
