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
