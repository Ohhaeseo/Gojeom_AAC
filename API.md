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

| # | Method | Path | 인증 | 설명 | PRD |
| --- | --- | --- | --- | --- | --- |
| 1 | POST | `/auth/signup` | — | 회원가입 | F-01 |
| 2 | POST | `/auth/login` | — | 로그인 | F-01 |
| 3 | POST | `/auth/oauth/google` | — | Google 로그인 | F-01 |
| 4 | POST | `/auth/refresh` | — | 토큰 갱신 | F-01 |
| 5 | POST | `/auth/logout` | ✔ | 로그아웃 | F-01 |
| 6 | GET | `/users/me` | ✔ | 내 정보 + 온보딩 상태 | F-01 |
| 7 | DELETE | `/users/me` | ✔ | 계정 삭제 | §10 |
| 8 | POST | `/uploads/presigned` | ✔ | 업로드용 presigned URL | F-02 |
| 9 | POST | `/profiles` | ✔ | 프로필 등록 | F-02·F-04 |
| 10 | GET | `/profiles/me` | ✔ | 프로필 조회 | F-13 |
| 11 | PATCH | `/profiles/me` | ✔ | 신체 정보 수정 | F-13 |
| 12 | PATCH | `/profiles/me/priorities` | ✔ | **우선순위 변경** | F-02·F-13 |
| 13 | DELETE | `/profiles/me/photo` | ✔ | 사진 삭제 | §10 |
| 14 | POST | `/profiles/inbody/scan` | ✔ | **인바디 서류 스캔(OCR)** | F-03 |
| 15 | POST | `/analyses` | ✔ | 고점 입력 → 키워드 추출 시작 | F-05 |
| 16 | GET | `/analyses/{id}` | ✔ | 진행 상태 폴링 | F-06 |
| 17 | GET | `/analyses/{id}/keywords` | ✔ | 키워드 후보 조회 | F-06 |
| 18 | POST | `/analyses/{id}/keywords/selection` | ✔ | 키워드 확정 → 결과 생성 | F-06 |
| 19 | GET | `/analyses/{id}/result` | ✔ | 결과 조회 (`FRESH`) | F-07 |
| 20 | POST | `/analyses/{id}/result/save` | ✔ | 서랍에 저장 | F-08 |
| 21 | GET | `/saved-results` | ✔ | 서랍 (3섹션) | F-08 |
| 22 | GET | `/saved-results/{id}` | ✔ | 서랍 상세 (`SAVED`) | F-08 |
| 23 | DELETE | `/saved-results/{id}` | ✔ | 서랍 항목 삭제 | F-08 |
| 24 | POST | `/routines` | ✔ | 목표 생성 (**경로 2종**) | F-09 |
| 25 | GET | `/routines` | ✔ | 목표 목록 | F-09 |
| 26 | GET | `/routines/{id}` | ✔ | 목표 상세 | F-10 |
| 27 | DELETE | `/routines/{id}` | ✔ | 내 목표 삭제 | F-10 |
| 28 | PATCH | `/routine-tasks/{id}` | ✔ | 완료 체크 | F-10 |
| 29 | GET | `/notifications/settings` | ✔ | 알림 설정 조회 | F-11 |
| 30 | PATCH | `/notifications/settings` | ✔ | 알림 설정 변경 | F-11 |
| 31 | POST | `/notifications/device-tokens` | ✔ | 푸시 토큰 등록 | F-11 |
| 32 | DELETE | `/analyses` | ✔ | **내 분석 전체 삭제** | F-13 |
| 33 | GET | `/subscriptions/me` | ✔ | 구독·분석권 상태 | F-12 |
| 34 | POST | `/subscriptions/checkout` | ✔ | 결제 시작 | F-12 |
| 35 | POST | `/subscriptions/webhook` | — | PG 웹훅 (서버 전용) | F-12 |
| 36 | GET | `/consents/terms` | — | 약관 목록 | §10 |

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

- ⚠️ **`analysisSummary`는 현재 항상 `null`이다.** AI 연동(D2-2) 전이라 채울 값이 없고, 가짜 값을 넣지 않는다. 연동되면 아래 형태가 들어간다.
  ```json
  { "faceImpression": ["부드러운 얼굴선"], "bodyRange": "표준 범위",
    "healthNotes": ["평균 수면 6.5시간 · 사용자 입력 기준"],
    "modelVersion": "...", "analyzedAt": "2026-08-14T04:12:00Z" }
  ```
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
- ⚠️ **기간이 길면 태스크가 많아진다.** 서버는 AI가 만든 한 주치 구성을 주 단위로 복제한다. 6개월 × 4개 = 96개. 프론트는 전부 그리지 말고 **해당 회차만** 보여준다.
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
        "taskCount": 24
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
{ "token": "fcm-token...", "platform": "WEB" }
```

---

### 6.8 구독

#### `GET /subscriptions/me`

```json
{
  "success": true,
  "data": {
    "plan": "TRIAL", "status": "ACTIVE",
    "analysisCredits": 1,
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

> 관련 화면이 미설계다(PRD O-3). API는 정의해두되 UI 연결은 보류한다.

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
