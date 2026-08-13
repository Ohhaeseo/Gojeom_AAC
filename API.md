# GO. (고점) — API 명세서 (Frontend ⇄ Backend 공통)

| 항목 | 내용 |
| --- | --- |
| 문서 버전 | v1.0 |
| 최종 수정일 | 2026-08-13 |
| 상위 문서 | [PRD.md](PRD.md) |
| 짝 문서 | [ERD.md](ERD.md) — 응답 필드와 DB 컬럼은 1:1 대응한다 |
| Base URL | `https://{host}/api/v1` |
| 인증 | JWT Bearer (Access 30분 / Refresh 14일) |
| Content-Type | `application/json; charset=utf-8` (파일 업로드는 스토리지 직접 PUT) |
| 시간 형식 | ISO-8601 UTC (`2026-08-10T04:12:00Z`) — **표시 시 KST 변환은 프론트 책임** |
| 네이밍 | 요청/응답 JSON은 `camelCase` |

> **이 문서가 프론트와 백엔드의 계약이다.** 한쪽이 임의로 필드를 추가·삭제하지 않는다. 변경이 필요하면 이 문서를 먼저 수정하고 양쪽에 공유한다.

---

## 1. 공통 응답 형식

### 성공

```json
{
  "success": true,
  "data": { }
}
```

### 실패

```json
{
  "success": false,
  "error": {
    "code": "ANALYSIS_NO_KEYWORD",
    "message": "조금 더 구체적으로 적어주세요.",
    "details": { "examples": ["차분하고 또렷한 인상이 되고 싶어요"] }
  }
}
```

- `error.message`는 **그대로 사용자에게 보여줄 수 있는 한국어 문구**로 내려온다. 프론트가 코드별 문구를 따로 관리하지 않아도 되게 한다. 단, 코드별 커스텀 UI(모달/토스트/인라인)는 프론트가 결정한다.
- 페이지네이션이 필요한 목록은 `data`에 `items` + `page` 객체를 담는다.

```json
{
  "success": true,
  "data": {
    "items": [],
    "page": { "number": 0, "size": 20, "totalElements": 37, "totalPages": 2 }
  }
}
```

---

## 2. 인증 규칙

| 구분 | 헤더 |
| --- | --- |
| 인증 필요 | `Authorization: Bearer {accessToken}` |
| 갱신 | `POST /auth/refresh` (body에 refreshToken) |

- **PRD O-3에 따라 랜딩/약관 조회를 제외한 모든 엔드포인트는 인증이 필요하다.**
- Access Token 만료 시 `401 AUTH_TOKEN_EXPIRED` → 프론트는 refresh 후 원 요청을 1회 재시도한다. refresh도 실패하면 로그인 화면으로 보내되 **직전 경로를 저장**해 복귀시킨다. (PRD F-01)
- 타인의 리소스 접근은 `404`가 아닌 `403 FORBIDDEN_RESOURCE`로 응답한다.

---

## 3. Enum 정의 (프론트·백엔드 공유)

| Enum | 값 | 표시 문구 |
| --- | --- | --- |
| `Provider` | `LOCAL` `KAKAO` `GOOGLE` | — |
| `Gender` | `MALE` `FEMALE` `UNSPECIFIED` | 남성 / 여성 / 선택 안 함 |
| `PriorityCategory` | `SKIN` `FACE` `BODY` `HEALTH` | 피부 / 얼굴형 / 체형 / 건강 |
| `RoutineCategory` | `SKIN` `HEALTH` `BODY` | 피부 / 건강 / 체형 |
| `InputMode` | `TEXT` `TEXT_IMAGE` | 자연어 / 자연어 + 사진 |
| `KeywordOrigin` | `TEXT` `IMAGE` `COMMON` `CONFLICT` | 텍스트 / 사진 / 공통 / 충돌 |
| `AnalysisStatus` | `CREATED` `EXTRACTING` `KEYWORDS_READY` `GENERATING` `DONE` `FAILED` | — |
| `ImageStatus` | `SKIPPED` `PENDING` `DONE` `FAILED` | — |
| `ChangeTag` | `STYLING` `SELF_CARE` `CARE` | 스타일링 / 셀프 관리 / 케어 |
| `TaskStatus` | `PENDING` `DONE` `MISSED` `RESCHEDULED` | — |
| `RoutineStatus` | `ACTIVE` `COMPLETED` `CANCELED` | — |
| `Plan` | `TRIAL` `MONTHLY` `YEARLY` | 무료 체험 / 월 구독 / 연 구독 |
| `ConsentCode` | `TERMS` `PRIVACY` `BIOMETRIC` `MARKETING` | — |

> `PriorityCategory`는 4종, `RoutineCategory`는 3종이다. 두 Enum을 하나로 합치지 않는다. (PRD O-1 / O-4)

---

## 4. 에러 코드

| HTTP | code | 사용자 노출 문구 | 발생 지점 |
| --- | --- | --- | --- |
| 400 | `VALIDATION_ERROR` | 입력값을 다시 확인해주세요. | 공통 |
| 401 | `AUTH_TOKEN_EXPIRED` | 로그인이 만료되었어요. | 공통 |
| 401 | `AUTH_INVALID_CREDENTIALS` | 이메일 또는 비밀번호를 확인해주세요. | 로그인 |
| 403 | `FORBIDDEN_RESOURCE` | 접근할 수 없는 항목이에요. | 공통 |
| 403 | `CONSENT_REQUIRED` | 필수 항목에 동의해주세요. | 프로필 생성 |
| 403 | `PROFILE_UNDERAGE` | 만 14세 이상만 이용할 수 있어요. | 프로필 생성 |
| 402 | `NO_ANALYSIS_CREDIT` | 분석권을 모두 사용했어요. | 분석 생성 |
| 404 | `NOT_FOUND` | 요청한 정보를 찾을 수 없어요. | 공통 |
| 409 | `PROFILE_REQUIRED` | 프로필을 먼저 등록해주세요. | 분석 생성 |
| 409 | `ANALYSIS_INVALID_STATE` | 지금은 진행할 수 없는 단계예요. | 키워드 확정 |
| 413 | `FILE_TOO_LARGE` | 10MB 이하 사진을 올려주세요. | 업로드 |
| 422 | `IMAGE_NO_FACE` | 얼굴이 인식되지 않았어요. 정면을 향한 밝은 사진을 올려주세요. | 프로필 사진 |
| 422 | `IMAGE_MULTIPLE_FACES` | 한 사람만 나온 사진을 올려주세요. | 프로필 사진 |
| 422 | `IMAGE_LOW_QUALITY` | 사진이 흐리거나 어두워요. 다시 촬영해주세요. | 프로필 사진 |
| 422 | `ANALYSIS_NO_KEYWORD` | 조금 더 구체적으로 적어주세요. | 키워드 추출 |
| 422 | `CONTENT_POLICY_BLOCKED` | 분석할 수 없는 내용이 포함되어 있어요. | AI 단계 |
| 500 | `AI_PROVIDER_ERROR` | 분석 중 문제가 생겼어요. 다시 시도해주세요. | AI 단계 |
| 504 | `ANALYSIS_TIMEOUT` | 분석이 지연되고 있어요. 다시 시도해주세요. | AI 단계 |

- `NO_ANALYSIS_CREDIT` `CONTENT_POLICY_BLOCKED` `ANALYSIS_TIMEOUT` **3건은 분석권을 차감하지 않는다.** (PRD O-6)
- `IMAGE_*` 계열은 프론트에서 MediaPipe로 1차 차단하지만, 서버도 동일 코드로 2차 검증한다.

---

## 5. 엔드포인트 개요

| # | Method | Path | 인증 | 설명 | PRD |
| --- | --- | --- | --- | --- | --- |
| 1 | POST | `/auth/signup` | — | 회원가입 | F-01 |
| 2 | POST | `/auth/login` | — | 로그인 | F-01 |
| 3 | POST | `/auth/refresh` | — | 토큰 갱신 | F-01 |
| 4 | POST | `/auth/logout` | ✔ | 로그아웃 | F-01 |
| 5 | GET | `/users/me` | ✔ | 내 정보 + 온보딩 상태 | F-01 |
| 6 | DELETE | `/users/me` | ✔ | 계정 삭제 | §10 |
| 7 | GET | `/consents/terms` | — | 약관 목록·버전 | §10 |
| 8 | POST | `/uploads/presigned` | ✔ | 업로드용 presigned URL 발급 | F-02 |
| 9 | POST | `/profiles` | ✔ | 프로필 등록 → 현재 프로필 생성 | F-02·F-03 |
| 10 | GET | `/profiles/me` | ✔ | 현재 프로필 조회 | F-03 |
| 11 | PATCH | `/profiles/me` | ✔ | 프로필 수정 | F-02 |
| 12 | DELETE | `/profiles/me/photo` | ✔ | 사진 삭제 | §10 |
| 13 | POST | `/analyses` | ✔ | 추구미 입력 → 키워드 추출 시작 | F-04·F-05 |
| 14 | GET | `/analyses/{id}` | ✔ | 진행 상태 폴링 | F-05 |
| 15 | GET | `/analyses/{id}/keywords` | ✔ | 키워드 후보 조회 | F-06 |
| 16 | POST | `/analyses/{id}/keywords/selection` | ✔ | 키워드 확정 → 결과 생성 시작 | F-06 |
| 17 | GET | `/analyses/{id}/result` | ✔ | 결과 조회 | F-07 |
| 18 | POST | `/analyses/{id}/result/feedback` | ✔ | 마음에 들어요 / 다시 분석하기 | F-07·F-08 |
| 19 | GET | `/saved-results` | ✔ | 서랍 목록 | F-08 |
| 20 | GET | `/saved-results/{id}` | ✔ | 서랍 상세 | F-08 |
| 21 | DELETE | `/saved-results/{id}` | ✔ | 서랍 삭제 | F-08 |
| 22 | POST | `/routines` | ✔ | 루틴 생성 | F-09 |
| 23 | GET | `/routines` | ✔ | 루틴 목록 | F-09 |
| 24 | GET | `/routines/{id}` | ✔ | 루틴 상세 | F-10 |
| 25 | PATCH | `/routines/{id}` | ✔ | 강도 조절 / 중단 | F-10 |
| 26 | GET | `/routine-tasks` | ✔ | 기간별 태스크 조회 | F-10 |
| 27 | PATCH | `/routine-tasks/{id}` | ✔ | 완료 체크 / 미수행 | F-10 |
| 28 | GET | `/notifications/settings` | ✔ | 알림 설정 조회 | F-11 |
| 29 | PATCH | `/notifications/settings` | ✔ | 알림 설정 변경 | F-11 |
| 30 | POST | `/notifications/device-tokens` | ✔ | 푸시 토큰 등록 | F-11 |
| 31 | GET | `/subscriptions/me` | ✔ | 구독·분석권 상태 | F-12 |
| 32 | POST | `/subscriptions/checkout` | ✔ | 결제 시작 | F-12 |
| 33 | POST | `/subscriptions/webhook` | — | PG 웹훅 (서버 전용) | F-12 |

---

## 6. 엔드포인트 상세

### 6.1 인증

#### `POST /auth/signup`

```json
// Request
{ "email": "user@example.com", "password": "Passw0rd!", "nickname": "해서" }
```

```json
// 201 Response
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": { "id": "0f8c...", "email": "user@example.com", "nickname": "해서" }
  }
}
```

- 가입 시 `TRIAL` 구독과 **분석권 1회**가 자동 생성된다. (PRD F-12)

#### `POST /auth/login`

```json
// Request
{ "email": "user@example.com", "password": "Passw0rd!" }
```

응답 형식은 signup과 동일하다.

#### `POST /auth/refresh`

```json
// Request
{ "refreshToken": "eyJ..." }
// 200 Response
{ "success": true, "data": { "accessToken": "eyJ...", "refreshToken": "eyJ..." } }
```

#### `GET /users/me`

프론트의 **라우팅 분기 기준**이다. 로그인 직후 이 API로 어느 화면에 보낼지 결정한다.

```json
{
  "success": true,
  "data": {
    "id": "0f8c...",
    "email": "user@example.com",
    "nickname": "해서",
    "hasProfile": true,
    "analysisCredits": 1,
    "subscription": { "plan": "TRIAL", "status": "ACTIVE", "expiresAt": "2026-09-10T00:00:00Z" }
  }
}
```

| `hasProfile` | 이동 화면 |
| --- | --- |
| `false` | 내 사진·기본 정보 등록 |
| `true` | 메인 화면 |

#### `DELETE /users/me`

`204`. 계정을 soft delete하고 **모든 이미지 객체를 즉시 삭제**한다. (ERD §7)

---

### 6.2 업로드

#### `POST /uploads/presigned`

이미지는 서버를 거치지 않고 **스토리지에 직접 PUT**한다. 서버 메모리·트래픽을 아끼고 업로드 진행률을 프론트가 직접 다룰 수 있다.

```json
// Request
{ "purpose": "PROFILE_PHOTO", "contentType": "image/jpeg", "contentLength": 2481920 }
```

`purpose`: `PROFILE_PHOTO` | `REFERENCE_IMAGE`

```json
// 200 Response
{
  "success": true,
  "data": {
    "uploadUrl": "https://storage.../profiles/0f8c.../a1b2.jpg?X-Amz-Signature=...",
    "objectKey": "profiles/0f8c.../a1b2.jpg",
    "expiresIn": 300
  }
}
```

**프론트 업로드 절차**

1. MediaPipe Face Detector로 **1차 검증** (얼굴 1인 검출)
2. `POST /uploads/presigned` 호출
3. `uploadUrl`에 `PUT` (헤더 `Content-Type`을 요청 시 보낸 값과 동일하게)
4. 반환받은 `objectKey`를 이후 API 바디에 담아 전송

- `contentLength > 10MB` → `413 FILE_TOO_LARGE`
- 조회 시 내려오는 이미지 URL은 **10분 만료 presigned URL**이다. 프론트는 URL을 캐시하거나 DB/localStorage에 저장하지 않는다.

---

### 6.3 프로필

#### `POST /profiles`

```json
// Request
{
  "photoKey": "profiles/0f8c.../a1b2.jpg",
  "birthDate": "1999-04-21",
  "gender": "FEMALE",
  "heightCm": 164,
  "weightKg": 52.4,
  "sleepHours": 6.5,
  "inbody": { "skeletalMuscleKg": 24.1, "bodyFatRate": 25.3, "bmi": 19.5 },
  "consents": [
    { "code": "TERMS", "agreed": true },
    { "code": "PRIVACY", "agreed": true },
    { "code": "BIOMETRIC", "agreed": true },
    { "code": "MARKETING", "agreed": false }
  ]
}
```

| 필드 | 필수 | 검증 |
| --- | --- | --- |
| photoKey | ✔ | presigned로 발급된 key만 허용 |
| birthDate | ✔ | 만 14세 이상 |
| gender | ✔ | Enum |
| heightCm | ✔ | 100~250 |
| weightKg | ✔ | 30~200 |
| sleepHours | — | 0~14, 0.5 단위 |
| inbody | — | 각 항목 개별 선택 가능 |
| consents | ✔ | `TERMS` `PRIVACY` `BIOMETRIC` 모두 `true` 아니면 `403 CONSENT_REQUIRED` |

```json
// 201 Response
{
  "success": true,
  "data": {
    "profileId": "7a2e...",
    "photoUrl": "https://storage.../a1b2.jpg?X-Amz-Signature=...",
    "analysisSummary": {
      "faceImpression": ["부드러운 얼굴선", "자연스러운 표정"],
      "bodyRange": "표준 범위",
      "healthNotes": ["평균 수면 6.5시간 · 사용자 입력 기준"]
    },
    "createdAt": "2026-08-10T03:50:00Z"
  }
}
```

- `analysisSummary` 생성은 3~8초가 걸린다. 프론트는 이 요청에 **로딩 화면**을 붙인다.
- 응답에 **점수·등급 필드는 존재하지 않는다.** (PRD G-1) 프론트도 임의 환산 표시를 만들지 않는다.

#### `PATCH /profiles/me`

신체 정보만 부분 수정한다. `photoKey`를 포함하면 **새 프로필 행이 생성**되고 기존 행은 비활성화된다. (ERD §3.3)

#### `DELETE /profiles/me/photo`

`204`. 스토리지 객체를 즉시 삭제한다. 사진 없는 프로필로는 신규 분석을 시작할 수 없다.

---

### 6.4 분석 (핵심 플로우)

#### `POST /analyses`

```json
// Request
{
  "priorityCategory": "SKIN",
  "inputMode": "TEXT_IMAGE",
  "inputText": "차분하면서 또렷한 인상이 되고 싶어요. 피부는 맑게 보이면 좋겠어요.",
  "referenceImageKey": "references/0f8c.../c3d4.jpg"
}
```

| 필드 | 필수 | 비고 |
| --- | --- | --- |
| priorityCategory | — | **`null` = 건너뛰기 → 4개 카테고리 동일 가중치** (PRD R-2) |
| inputMode | ✔ | |
| inputText | ✔ | **두 모드 모두 필수**, 10~300자 (PRD F-05) |
| referenceImageKey | 조건부 | `inputMode = TEXT_IMAGE`일 때만 필수 |

```json
// 202 Response
{
  "success": true,
  "data": { "analysisId": "b91d...", "status": "EXTRACTING", "pollAfterMs": 2000 }
}
```

- 사전 조건: 활성 프로필 없으면 `409 PROFILE_REQUIRED`, 분석권 0이면 `402 NO_ANALYSIS_CREDIT`.
- **분석권은 이 시점에 차감하지 않는다.** 결과 생성 성공 시 차감한다. (PRD O-6)

#### `GET /analyses/{id}` — 상태 폴링

프론트는 `pollAfterMs` 간격으로 이 API만 호출하면 된다.

```json
{
  "success": true,
  "data": {
    "analysisId": "b91d...",
    "status": "KEYWORDS_READY",
    "imageStatus": "PENDING",
    "progress": 45,
    "message": "추구미 키워드를 찾고 있어요",
    "failureCode": null,
    "pollAfterMs": 2000
  }
}
```

| status | progress | 프론트 동작 |
| --- | --- | --- |
| `CREATED` `EXTRACTING` | 0~50 | 로딩 유지 |
| `KEYWORDS_READY` | 50 | **폴링 중단** → 키워드 선택 화면 |
| `GENERATING` | 50~99 | 로딩 유지 |
| `DONE` | 100 | **폴링 중단** → 결과 화면 |
| `FAILED` | — | 폴링 중단 → `failureCode`로 에러 UI |

- 폴링 상한 **60초**. 초과 시 프론트가 중단하고 `ANALYSIS_TIMEOUT` UI를 띄운다. (PRD §8.3)
- `imageStatus`는 `status = DONE` 이후에도 `PENDING`일 수 있다. 이 경우 결과 화면을 먼저 그리고 이미지 자리에는 스켈레톤을 유지한 뒤, 이 API를 계속 폴링해 `DONE`이 되면 교체한다.

#### `GET /analyses/{id}/keywords`

```json
{
  "success": true,
  "data": {
    "analysisId": "b91d...",
    "minSelect": 1,
    "maxSelect": 4,
    "keywords": [
      { "id": "k1", "label": "맑은 피부 표현", "reason": "입력하신 '맑게'에서 도출했어요.", "category": "SKIN",  "origin": "COMMON",   "displayOrder": 1 },
      { "id": "k2", "label": "또렷한 눈매",     "reason": "'또렷한 인상'과 사진의 눈썹선이 같은 방향이에요.", "category": "FACE", "origin": "COMMON", "displayOrder": 2 },
      { "id": "k3", "label": "차분한 무드",     "reason": "입력 문장의 분위기예요.", "category": "FACE", "origin": "TEXT", "displayOrder": 3 },
      { "id": "k7", "label": "화려한 컬러 포인트", "reason": "사진은 화려한 톤이지만 문장은 차분한 무드예요. 어느 쪽을 원하는지 선택해주세요.", "category": "SKIN", "origin": "CONFLICT", "displayOrder": 7 }
    ]
  }
}
```

**프론트 렌더링 규칙**

- `origin = CONFLICT`는 **별도 섹션**으로 분리하고 "사진과 문장의 방향이 달라요" 안내를 붙인다. (PRD F-05)
- 모든 키워드는 **미선택 상태로 시작**한다. AI 추천을 기본 체크하지 않는다. (PRD F-06 / G-5)
- `minSelect` 미만이면 다음 버튼 비활성. (PRD R-3)

#### `POST /analyses/{id}/keywords/selection`

```json
// Request
{ "keywordIds": ["k1", "k2", "k3"] }
// 202 Response
{ "success": true, "data": { "analysisId": "b91d...", "status": "GENERATING", "pollAfterMs": 3000 } }
```

- `status != KEYWORDS_READY`면 `409 ANALYSIS_INVALID_STATE`.
- 개수가 1~4 범위를 벗어나면 `400 VALIDATION_ERROR`.

#### `GET /analyses/{id}/result` — 결과 화면 (PRD F-07)

**응답의 키 순서가 결과 화면 9개 블록 순서와 같다.** 프론트는 이 순서대로 렌더링한다.

```json
{
  "success": true,
  "data": {
    "resultId": "r55a...",
    "analysisId": "b91d...",
    "analyzedAt": "2026-08-10T04:12:00Z",
    "nickname": "해서",

    "summary": "현재의 자연스러운 인상은 유지하면서 차분하고 또렷한 분위기를 반영했어요.",

    "comparisonImage": {
      "status": "DONE",
      "url": "https://storage.../r55a.png?X-Amz-Signature=...",
      "caption": "좌우 비교해 본 모습을 기준으로 한 임시 이미지예요."
    },

    "overview": {
      "keywords": ["맑은 피부 표현", "또렷한 눈매", "차분한 무드"],
      "keepPoints": ["부드러운 얼굴선과 자연스러운 표정"],
      "emphasizePoints": ["눈썹선, 피부 톤의 균형, 옆선 볼륨"],
      "changeIntensity": 35,
      "intensityLabel": "자연스럽게"
    },

    "topChanges": [
      { "rank": 1, "title": "눈썹선을 조금 더 선명하게", "description": "완만한 일자형으로 정돈하면 차분하면서 또렷한 인상이 살아나요. 진한 색보다 현재 모발과 비슷한 색을 추천해요.", "tag": "STYLING" },
      { "rank": 2, "title": "피부 표현은 얇고 균일하게", "description": "광택을 과하게 더하기보다 수분감과 피부 톤의 균형을 먼저 맞춰보세요. 가벼운 베이스 표현이 목표 분위기와 잘 맞아요.", "tag": "SELF_CARE" },
      { "rank": 3, "title": "얼굴 옆선에 자연스러운 볼륨", "description": "윗머리는 높이지 않고 옆선이 부드럽게 연결되도록 정리하면 얼굴형의 균형을 유지하면서 차분한 인상을 만들 수 있어요.", "tag": "CARE" }
    ],

    "dailyCares": [
      { "title": "수분 진정 루틴", "description": "아침에는 자외선 관리, 저녁에는 보습 단계를 단순하게 유지해 보세요." },
      { "title": "눈썹과 헤어 라인 정돈", "description": "변화폭을 크게 주기 전, 눈썹 꼬리와 옆머리 연결만 먼저 다듬어 보세요." },
      { "title": "수면 시간 안정화", "description": "건강 정보는 사진이 아닌 사용자가 입력한 평균 수면시간을 기준으로 제안했어요." }
    ],

    "recommendedRoutines": [
      { "category": "SKIN",   "title": "피부·수분 균형 루틴", "recommendedWeeks": 4, "minutesPerDay": 8, "perWeek": 6, "priorityRank": 1 },
      { "category": "HEALTH", "title": "건강·수면 안정 루틴", "recommendedWeeks": 3, "minutesPerDay": 5, "perWeek": 7, "priorityRank": 2 },
      { "category": "BODY",   "title": "체형·가벼운 자세 루틴", "recommendedWeeks": 2, "minutesPerDay": 7, "perWeek": 5, "priorityRank": 3 }
    ],

    "liked": null,
    "saved": false,
    "disclaimer": "AI가 생성한 참고용 이미지와 관리 방향입니다. 피부·건강 상태에 대한 의료적 진단이나 시술 결과를 의미하지 않습니다."
  }
}
```

**프론트 렌더링 규칙**

| 조건 | 처리 |
| --- | --- |
| `comparisonImage.status = SKIPPED` | ③ 블록 **미렌더링** (텍스트만 입력한 분석) |
| `comparisonImage.status = PENDING` | ③ 블록에 스켈레톤 + `GET /analyses/{id}` 폴링 계속 |
| `comparisonImage.status = FAILED` | ③ 블록 자리에 "예상 이미지는 생성하지 못했어요" 안내, 나머지 결과는 정상 노출 |
| `priorityRank` 1·2 | `우선 1` `우선 2` 뱃지, 3 이상은 `선택` |
| `disclaimer` | **상시 노출, 숨김·접기 불가** (PRD F-07 수용 기준 ③) |

- `topChanges`는 **항상 3건**이다. 프론트는 3건 고정 레이아웃으로 만들어도 된다.
- `recommendedRoutines`는 최대 3건이며 사용자가 여기서 선택한 항목이 `POST /routines` 입력이 된다.

#### `POST /analyses/{id}/result/feedback`

결과 화면 ⑧ 블록. **분기와 저장이 한 번에 처리된다.** (PRD R-4)

```json
// Request — "마음에 들어요"
{ "liked": true }
```

```json
// 200 Response
{
  "success": true,
  "data": { "liked": true, "savedResultId": "s12a...", "nextStep": "MAIN" }
}
```

```json
// Request — "다시 분석하기"
{ "liked": false }
```

```json
// 200 Response
{
  "success": true,
  "data": {
    "liked": false,
    "savedResultId": null,
    "nextStep": "REANALYZE",
    "retainedProfileId": "7a2e..."
  }
}
```

- `liked = true`일 때만 `saved_results`에 저장된다. 자동 저장은 없다.
- `liked = false`면 프론트는 **추구미 입력 방식 선택 화면**으로 돌아간다. `retainedProfileId`가 내려온다는 것은 **로그인·프로필이 유지된다**는 뜻이다. 사진 재등록 화면으로 보내면 안 된다. (PRD R-1)
- 재분석은 새 `POST /analyses`로 시작하며, 서버가 `retriedFrom`에 원본 분석 ID를 기록한다.

---

### 6.5 서랍 (저장된 결과)

#### `GET /saved-results?page=0&size=20`

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "savedResultId": "s12a...",
        "resultId": "r55a...",
        "thumbnailUrl": "https://storage.../r55a_thumb.png?X-Amz-Signature=...",
        "summary": "차분하고 또렷한 분위기",
        "keywords": ["맑은 피부 표현", "또렷한 눈매"],
        "savedAt": "2026-08-10T04:20:00Z"
      }
    ],
    "page": { "number": 0, "size": 20, "totalElements": 3, "totalPages": 1 }
  }
}
```

`thumbnailUrl`은 이미지가 없는 결과(`SKIPPED` `FAILED`)에서는 `null`이다. 프론트는 대체 카드(키워드 칩 요약)를 노출한다.

#### `GET /saved-results/{id}`

`GET /analyses/{id}/result`와 **동일한 스키마**를 반환한다. 프론트는 결과 화면 컴포넌트를 재사용한다.

#### `DELETE /saved-results/{id}` — `204`

---

### 6.6 루틴

#### `POST /routines`

```json
// Request — 저장된 분석 결과 가져오기
{
  "sourceAnalysisResultId": "r55a...",
  "startDate": "2026-08-14",
  "items": [
    { "category": "SKIN",   "durationWeeks": 4 },
    { "category": "HEALTH", "durationWeeks": 3 }
  ]
}
```

```json
// Request — 루틴만 생성
{
  "sourceAnalysisResultId": null,
  "startDate": "2026-08-14",
  "items": [{ "category": "BODY", "durationWeeks": 2 }]
}
```

| 필드 | 검증 |
| --- | --- |
| items | 1~3개, `category` 중복 불가 |
| durationWeeks | **1~12** (PRD O-2) |
| startDate | 오늘 이후 |

```json
// 201 Response
{
  "success": true,
  "data": {
    "routines": [
      {
        "routineId": "rt01...",
        "category": "SKIN",
        "title": "피부·수분 균형 루틴",
        "durationWeeks": 4,
        "perWeek": 6,
        "minutesPerDay": 8,
        "priorityRank": 1,
        "startDate": "2026-08-14",
        "endDate": "2026-09-10",
        "taskCount": 24
      }
    ]
  }
}
```

태스크는 생성 시 **전체 기간분이 일괄 생성**된다. (ERD E-4)

#### `GET /routines?status=ACTIVE`

루틴 목록 + 진행률.

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "routineId": "rt01...",
        "category": "SKIN",
        "title": "피부·수분 균형 루틴",
        "status": "ACTIVE",
        "startDate": "2026-08-14",
        "endDate": "2026-09-10",
        "progress": { "done": 5, "total": 24, "rate": 20.8 },
        "missedStreak": 0,
        "suggestLowerIntensity": false
      }
    ]
  }
}
```

`suggestLowerIntensity = true`는 **연속 3회 미수행**을 뜻한다. 프론트는 "강도 낮추기" 제안 카드를 노출한다. 이때 문구는 **사용자를 실패로 규정하지 않는다.** (PRD F-10)

#### `GET /routine-tasks?from=2026-08-14&to=2026-08-20`

루틴 화면의 주간 뷰 데이터.

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "taskId": "tk88...",
        "routineId": "rt01...",
        "category": "SKIN",
        "title": "저녁 보습 단계 정리",
        "description": "토너 → 세럼 → 크림 3단계로 단순하게",
        "scheduledDate": "2026-08-14",
        "scheduledTime": "21:00",
        "status": "PENDING",
        "originalDate": null,
        "rescheduleCount": 0
      }
    ]
  }
}
```

`originalDate`가 있으면 **재배치된 태스크**다. 프론트는 "옮겨온 루틴" 표시를 붙일 수 있다.

#### `PATCH /routine-tasks/{id}`

```json
// Request
{ "status": "DONE" }
```

```json
// 200 Response — 재배치가 발생한 경우
{
  "success": true,
  "data": {
    "taskId": "tk88...",
    "status": "MISSED",
    "rescheduledTask": {
      "taskId": "tk91...",
      "scheduledDate": "2026-08-16",
      "originalDate": "2026-08-14",
      "rescheduleCount": 1
    }
  }
}
```

**재배치 규칙** (PRD F-10 / ERD §3.7)

- `MISSED` 전환 시 서버가 다음 가능한 날짜로 태스크를 복제한다.
- **`endDate`를 넘겨 연장하지 않는다.** 기간 내 자리가 없으면 `rescheduledTask`가 `null`로 내려온다.
- 자정 배치도 동일 로직으로 미수행 태스크를 처리하므로, 프론트가 미수행을 직접 표시할 필요는 없다.

#### `PATCH /routines/{id}`

```json
{ "action": "LOWER_INTENSITY" }   // perWeek 하향 + 남은 태스크 재생성
{ "action": "CANCEL" }            // status = CANCELED
```

---

### 6.7 알림

#### `GET` / `PATCH /notifications/settings`

```json
{ "enabled": true, "defaultTime": "21:00" }
```

기본값은 `enabled = false`다. 최초 루틴 생성 시 동의를 받고 켠다. (PRD F-11)

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
    "plan": "TRIAL",
    "status": "ACTIVE",
    "analysisCredits": 1,
    "startedAt": "2026-08-10T00:00:00Z",
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

프론트는 `canAnalyze` / `canCreateRoutine`만 보고 게이팅한다. 만료·잔여 크레딧 계산을 프론트에서 하지 않는다.

#### `POST /subscriptions/checkout`

```json
// Request
{ "plan": "MONTHLY" }
// 200 Response
{ "success": true, "data": { "paymentId": "p01...", "redirectUrl": "https://pg.../checkout/..." } }
```

구독 만료 후에도 **서랍 조회와 기존 루틴 수행은 가능**하다. 신규 분석·루틴 생성만 차단한다. (PRD F-12)

---

## 7. 부록 A — OpenAI 연동 규격 (백엔드 전용)

프론트는 이 절을 구현할 필요가 없다. 다만 **응답 필드가 여기서 나온다**는 점을 알아두면 디버깅에 도움이 된다.

### 7.1 단계별 모델 매핑

| 단계 | 엔드포인트 | 모델 | 비고 |
| --- | --- | --- | --- |
| `PROFILE_ANALYSIS` | `/v1/chat/completions` | 멀티모달 텍스트 모델 | 사용자 사진 + 신체정보 → `analysis_summary` |
| `KEYWORD_EXTRACTION` | `/v1/chat/completions` | 멀티모달 텍스트 모델 | 텍스트 (+ 참고 이미지) → 키워드 5~8개 |
| `RESULT_GENERATION` | `/v1/chat/completions` | 멀티모달 텍스트 모델 | 선택 키워드 → 결과 전체 |
| `IMAGE_GENERATION` | `/v1/images/edits` | 이미지 모델 | 사용자 사진 기반 편집 |
| `ROUTINE_GENERATION` | `/v1/chat/completions` | 멀티모달 텍스트 모델 | 결과 + 카테고리/기간 → 태스크 |

- **모델 ID는 코드에 하드코딩하지 말고 `application.yml`에 핀 고정한다.** (`openai.model.text`, `openai.model.image`) 모델이 바뀌면 설정만 교체하고, 실제 사용한 값은 `ai_jobs.model`에 기록한다.
- 모든 텍스트 단계는 `response_format: { "type": "json_schema", "json_schema": { "strict": true, ... } }`를 사용한다. **자유 서술 파싱 금지.** (PRD §8.1)
- API 키는 서버 환경변수(`OPENAI_API_KEY`)로만 관리한다. **프론트에서 OpenAI를 직접 호출하지 않는다.**

### 7.2 Structured Output 스키마 — 키워드 추출

```json
{
  "name": "keyword_extraction",
  "strict": true,
  "schema": {
    "type": "object",
    "additionalProperties": false,
    "required": ["keywords"],
    "properties": {
      "keywords": {
        "type": "array", "minItems": 5, "maxItems": 8,
        "items": {
          "type": "object",
          "additionalProperties": false,
          "required": ["label", "reason", "category", "origin"],
          "properties": {
            "label":    { "type": "string", "maxLength": 40 },
            "reason":   { "type": "string", "maxLength": 120 },
            "category": { "type": "string", "enum": ["SKIN", "FACE", "BODY", "HEALTH"] },
            "origin":   { "type": "string", "enum": ["TEXT", "IMAGE", "COMMON", "CONFLICT"] }
          }
        }
      }
    }
  }
}
```

`inputMode = TEXT`인 경우 `origin`은 `TEXT`만 나온다. `IMAGE` `COMMON` `CONFLICT`는 참고 이미지가 있을 때만 유효하다.

### 7.3 Structured Output 스키마 — 결과 생성

```json
{
  "name": "aspiration_result",
  "strict": true,
  "schema": {
    "type": "object",
    "additionalProperties": false,
    "required": ["summary", "keepPoints", "emphasizePoints", "changeIntensity",
                 "intensityLabel", "topChanges", "dailyCares", "recommendedRoutines"],
    "properties": {
      "summary":          { "type": "string", "maxLength": 120 },
      "keepPoints":       { "type": "array", "minItems": 1, "maxItems": 3, "items": { "type": "string" } },
      "emphasizePoints":  { "type": "array", "minItems": 1, "maxItems": 3, "items": { "type": "string" } },
      "changeIntensity":  { "type": "integer", "minimum": 0, "maximum": 100 },
      "intensityLabel":   { "type": "string", "maxLength": 20 },
      "topChanges": {
        "type": "array", "minItems": 3, "maxItems": 3,
        "items": {
          "type": "object",
          "additionalProperties": false,
          "required": ["rank", "title", "description", "tag"],
          "properties": {
            "rank":        { "type": "integer", "minimum": 1, "maximum": 3 },
            "title":       { "type": "string", "maxLength": 40 },
            "description": { "type": "string", "maxLength": 200 },
            "tag":         { "type": "string", "enum": ["STYLING", "SELF_CARE", "CARE"] }
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
      },
      "recommendedRoutines": {
        "type": "array", "minItems": 1, "maxItems": 3,
        "items": {
          "type": "object", "additionalProperties": false,
          "required": ["category", "title", "recommendedWeeks", "minutesPerDay", "perWeek", "priorityRank"],
          "properties": {
            "category":         { "type": "string", "enum": ["SKIN", "HEALTH", "BODY"] },
            "title":            { "type": "string", "maxLength": 40 },
            "recommendedWeeks": { "type": "integer", "minimum": 1, "maximum": 12 },
            "minutesPerDay":    { "type": "integer", "minimum": 1, "maximum": 60 },
            "perWeek":          { "type": "integer", "minimum": 1, "maximum": 7 },
            "priorityRank":     { "type": "integer", "minimum": 1, "maximum": 3 }
          }
        }
      }
    }
  }
}
```

### 7.4 시스템 프롬프트 필수 규칙 (PRD §8.2 가드레일)

모든 텍스트 단계의 시스템 프롬프트에 아래를 포함한다. 출력 후 서버가 재검증한다.

```text
- 외모를 점수·등급·순위로 평가하지 않는다. (G-1)
- 참고 이미지 속 인물의 얼굴을 복제하지 않는다. 분위기 요소(라인·톤·볼륨)만 적용한다. (G-2)
- 의료 진단, 시술 권유, 효능 보장 표현을 하지 않는다. (G-3)
- 체중 목표를 수치로 단정하거나 극단적 식이·단식을 제안하지 않는다. (G-4)
- 사용자가 입력하지 않은 정보를 근거로 삼지 않으며, 근거에 참조한 입력을 명시한다. (G-5)
- 결점 중심으로 서술하지 않는다. "부족하다" 대신 "이렇게 하면 가까워진다"로 표현한다. (G-6)
```

**서버 측 후검증**: 응답 텍스트에 점수 패턴(`\d+점`, `상위 \d+%`)이나 금지어(`치료`, `시술받`, `진단`)가 포함되면 1회 재생성하고, 재차 검출되면 `AI_PROVIDER_ERROR`로 처리한다. 프롬프트만으로 가드레일을 보장하지 않는다.

### 7.5 이미지 생성

- 입력: **사용자 사진(주)** + 참고 이미지(보조) + 선택 키워드 기반 프롬프트
- 프롬프트에 **"참고 이미지의 인물 얼굴을 복제하지 말고 분위기 요소만 반영"** 을 명시한다. (G-2)
- 출력은 base64로 반환되므로 서버가 디코딩해 스토리지에 저장하고 `comparison_image_key`를 기록한다. 이미지 바이트를 DB에 넣지 않는다. (ERD D-4)
- **실제 인물 사진 편집은 제공자 정책에 의해 거부될 수 있다.** 거부 시 예외로 처리하지 말고 `image_status = FAILED`로 저장한 뒤 텍스트 결과만 노출한다. 이 경로는 예외가 아니라 **정상 시나리오**로 취급한다. (PRD §8.3)
- 이미지 실패는 분석권을 차감하지 않는 사유가 **아니다.** 텍스트 결과가 정상 생성되었으면 차감한다.

---

## 8. 부록 B — 프론트 구현 체크리스트

| # | 항목 |
| --- | --- |
| C-1 | `GET /users/me`의 `hasProfile`로 최초 진입 라우팅을 분기한다 |
| C-2 | 이미지 업로드는 presigned URL 직접 PUT. 서버로 multipart를 보내지 않는다 |
| C-3 | 조회용 이미지 URL은 10분 만료다. 캐시·영구 저장하지 않는다 |
| C-4 | 분석 진행은 `GET /analyses/{id}` 단일 폴링으로만 추적한다 (상한 60초) |
| C-5 | 키워드는 미선택 상태로 시작하고, `CONFLICT`는 별도 섹션으로 분리한다 |
| C-6 | 결과 화면에서 `disclaimer`를 상시 노출한다 (숨김·접기 금지) |
| C-7 | `comparisonImage.status` 4가지 분기를 모두 구현한다 |
| C-8 | "다시 분석하기"에서 사진 재등록 화면으로 보내지 않는다 |
| C-9 | 구독 게이팅은 `canAnalyze` / `canCreateRoutine` 값만으로 판단한다 |
| C-10 | 점수·등급·순위 형태의 UI를 만들지 않는다 (서비스 원칙 §1.5) |

---

## 9. 미결 사항

| # | 내용 | 확정 필요 시점 |
| --- | --- | --- |
| A-1 | `changeIntensity` 산출식 (PRD O-5 / ERD E-1) — 현재는 AI 출력값 그대로 전달 | M1 |
| A-2 | 소셜 로그인 제공자 확정 → `POST /auth/oauth/{provider}` 스펙 추가 | M2 |
| A-3 | PG사 확정 → `/subscriptions/checkout` 응답과 웹훅 페이로드 변경 가능 | M6 |
| A-4 | 알림 전송 수단(FCM vs Web Push) → `device-tokens.platform` 처리 분기 | M6 |
