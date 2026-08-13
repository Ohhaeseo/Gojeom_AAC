# GO. — Backend

Spring Boot 기반 REST API 서버.

## 기술 스택

| 영역 | 선택 |
| --- | --- |
| Framework | Spring Boot 3.x · Java 17 |
| 빌드 | Gradle |
| ORM | Spring Data JPA · Hibernate 6 |
| DB | PostgreSQL 16 |
| 마이그레이션 | Flyway |
| 인증 | Spring Security · JWT |
| 스토리지 | S3 호환 오브젝트 스토리지 (국내 리전) |
| AI | OpenAI API (Structured Outputs · Image Edits) |

## 작업 브랜치

이 폴더의 작업은 `backend` 브랜치에서 진행한다.

```bash
git switch backend
```

## 폴더 구조 (계획)

```text
backend/
└─ src/main/
   ├─ java/com/gojeom/
   │  ├─ auth/          # 회원가입 · 로그인 · JWT
   │  ├─ user/
   │  ├─ profile/       # 사진 · 기본 정보 · 현재 프로필 생성
   │  ├─ analysis/      # 추구미 분석 파이프라인 (핵심)
   │  ├─ routine/       # 루틴 생성 · 완료 체크 · 재배치
   │  ├─ subscription/  # 구독 · 분석권
   │  ├─ ai/            # OpenAI 클라이언트 · 프롬프트 · 스키마 검증
   │  ├─ storage/       # presigned URL 발급
   │  └─ common/        # 공통 응답 · 예외 · 설정
   └─ resources/
      ├─ application.yml
      └─ db/migration/  # V1__init.sql
```

## 환경 변수

`application.yml`에 값을 직접 적지 않는다. 전부 환경 변수로 주입한다.

```text
DB_URL
DB_USERNAME
DB_PASSWORD
JWT_SECRET
OPENAI_API_KEY
STORAGE_ENDPOINT
STORAGE_ACCESS_KEY
STORAGE_SECRET_KEY
STORAGE_BUCKET
```

## 구현 시 반드시 지킬 것

- **OpenAI 모델 ID는 하드코딩하지 않는다.** `openai.model.text` / `openai.model.image` 설정으로 핀 고정하고, 실제 사용값을 `ai_jobs.model`에 기록한다.
- 텍스트 단계는 **strict JSON Schema(Structured Outputs)** 로 강제한다. 자유 서술 파싱 금지.
- 가드레일(PRD §8.2)은 프롬프트만으로 보장하지 않는다. **서버 측 후검증**을 반드시 거친다. ([API.md](../API.md) §7.4)
- 분석권 차감은 **결과 생성 성공 시점**에 단일 UPDATE 문으로 처리한다. (PRD O-6)
- 이미지 생성 실패는 예외가 아니라 **정상 시나리오**다. `image_status = FAILED`로 저장하고 텍스트 결과만 응답한다.
- `ai_jobs`에 **프롬프트 원문과 사용자 사진을 저장하지 않는다.** (PRD §9)

## 관련 문서

- [PRD.md](../PRD.md) — 제품 요구사항
- [API.md](../API.md) — API 계약 (엔드포인트 33종 · OpenAI 연동 규격)
- [ERD.md](../ERD.md) — 데이터 모델 · Flyway 초기 마이그레이션
