# 백엔드 변경사항 인수인계 — 2026-08-16

## 1. 기준과 범위

- 대상 저장소: `Ohhaeseo/Gojeom_AAC`
- 대상 브랜치: `backend`
- 임시 작업 기준: `tldjs0/test`의 `main` 브랜치, 커밋 `70d0a13`
- 반영 범위: `backend/**`와 이 인수인계 문서
- 제외 범위: `frontend/**`, 로컬 `.env`, IntelliJ 개인 실행 구성, 실제 API 키·DB 비밀번호

원본 저장소의 `AGENTS.md`, PRD, API, ERD 및 backend 문서를 정본으로 유지한다.
임시 저장소와 원본 문서가 충돌하면 원본 저장소 문서를 우선한다.

## 2. 이번에 반영한 변경

### 2.1 이미지 검증 의존성 교체

- 얼굴 검출 구현을 OpenIMAJ 기반에서 OpenCV 기반으로 교체했다.
- OpenPnP OpenCV 패키지로 운영체제별 네이티브 바이너리를 공급한다.
- OpenIMAJ의 오래된 전이 의존성은 `compileClasspath`에 들어오지 않도록 차단했다.
- 해결한 증상: Maven 저장소에서 찾을 수 없는 OpenIMAJ 전이 아티팩트 때문에 `compileJava`가 실패하던 문제.

주요 파일:

- `backend/build.gradle`
- `backend/src/main/java/com/gojeom/profile/OpenCvProfileFaceDetector.java`
- `backend/src/main/java/com/gojeom/profile/ProfilePhotoValidator.java`
- `backend/src/main/java/com/gojeom/storage/ImageContentInspector.java`

### 2.2 업로드 이미지와 스토리지 삭제 안정성

- 업로드 메타데이터뿐 아니라 실제 이미지 내용과 얼굴 존재 여부를 검증한다.
- 사용자·프로필·분석·서랍 삭제 시 연결된 스토리지 객체의 삭제 요청을 누락하지 않도록 보강했다.
- S3 삭제 실패를 영속 작업으로 기록하고 스케줄러가 재시도하도록 했다.
- Flyway `V6__storage_deletion_jobs.sql`을 추가했다.
- 계정 삭제와 분석 삭제의 동시 요청에서 중복 처리나 소유권 누락이 발생하지 않도록 서비스와 저장소 쿼리를 보강했다.

### 2.3 인바디 OCR 원본 삭제 보장

- `INBODY_DOCUMENT`는 OCR 처리에만 쓰는 일회성 원본으로 취급한다.
- 먼저 사용자 소유권을 검증한다.
- 소유권 검증을 통과한 원본은 OCR 성공, AI 오류, 인식 필드 없음과 관계없이 처리 종료 시 삭제 큐에 기록한다.
- 다른 사용자의 key는 삭제하지 않는다.
- 관련 단위 테스트 5건을 추가했다.

### 2.4 인증·동시성·응답 계약 보강

- JWT 필터와 인증 서비스의 예외·동시성 경계를 보강했다.
- soft delete 사용자 재가입을 허용하도록 활성 사용자 범위의 부분 유니크 인덱스를 추가했다.
- Flyway `V7__users_provider_unique_only_active.sql`을 추가했다.
- `ProfileResponse.analysisSummary`가 `null`이어도 응답 키가 사라지지 않도록 직렬화 계약을 보강했다.
- 분석 생성, 서랍 저장 등 중복 요청에 대한 회귀 테스트를 추가했다.

### 2.5 Docker 29 통합 테스트 호환

- Spring Boot 3.3.5 기본 Testcontainers 1.19.8 대신 `1.21.4`를 사용하도록 고정했다.
- 해결한 증상: Docker Engine 29에서 `DockerClientProviderStrategy` 초기화가 실패하던 문제.

### 2.6 개발 문서 정리

- `backend/.env.example`의 깨진 한글 주석을 UTF-8 문장으로 복구했다.
- `backend/ARCHITECTURE.md`에 인바디 OCR 원본 삭제 정책을 반영했다.
- `backend/HANDOVER.md`에 해소된 항목과 Docker 29 통합 테스트 결과를 반영했다.

## 3. 데이터베이스 변경

기존 V1~V5 뒤에 다음 마이그레이션이 추가됐다.

| 버전 | 목적 |
| --- | --- |
| V6 | 실패한 스토리지 객체 삭제를 영속 기록하고 재시도하기 위한 테이블 추가 |
| V7 | soft delete 사용자를 제외한 활성 사용자 기준 provider 유일성 보장 |

`ddl-auto`는 계속 `validate`를 유지한다. 스키마 변경은 Flyway 파일로만 수행한다.

## 4. 검증 결과

| 검증 | 결과 |
| --- | --- |
| `clean compileJava` | 성공 |
| `clean test integrationTest` | 성공 |
| Docker Desktop 29.7.2 + Testcontainers 1.21.4 | 성공 |
| PostgreSQL 16 컨테이너 연결 | 성공 |
| Flyway V1~V7 신규 적용 | 성공 |
| `GET /actuator/health` | `{"status":"UP"}` |

통합 테스트는 Testcontainers를 사용하므로 Docker Desktop이 실행 중이어야 한다.

## 5. Windows·IntelliJ 로컬 실행

### 5.1 PostgreSQL 포트 충돌

Windows에 설치된 PostgreSQL이 `5432`를 이미 사용하면 Docker PostgreSQL과 충돌할 수 있다.
이 경우 로컬에서만 `backend/docker-compose.yml`의 포트 매핑을 다음처럼 바꾼다.

```yaml
ports:
  - "5433:5432"
```

그리고 로컬 환경변수를 다음처럼 사용한다.

```text
DB_URL=jdbc:postgresql://127.0.0.1:5433/gojeom
DB_USERNAME=gojeom
DB_PASSWORD=gojeom
```

이 포트 변경은 개인 PC 환경에 따른 우회이므로 팀 공통 설정으로 확정하지 않았다.

### 5.2 `.env`와 IntelliJ

- Spring Boot와 IntelliJ는 `backend/.env`를 자동으로 읽지 않는다.
- Git Bash에서는 `set -a`, `source ./.env`, `set +a` 후 실행한다.
- IntelliJ 실행 버튼을 사용할 때는 `Run/Debug Configurations`의 Environment variables에 같은 값을 등록한다.
- IntelliJ Working directory는 `backend` 디렉터리로 둔다.
- Git Bash에서 `export`한 값은 이미 실행 중인 IntelliJ에 자동 전달되지 않는다.

### 5.3 필수 환경변수

- DB: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`
- 인증: `JWT_SECRET` — HS256 기준 최소 32바이트
- OpenAI: `OPENAI_API_KEY`, `OPENAI_MODEL_TEXT`, `OPENAI_MODEL_IMAGE`
- 스토리지: `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`

실제 OpenAI·S3가 없을 때 비어 있지 않은 로컬 자리표시자로 애플리케이션 기동만 확인할 수는 있다.
그러나 이 상태에서 AI 분석, 이미지 생성, 업로드·조회 API는 실제로 동작하지 않는다.
가짜 응답으로 대체하지 말고 외부 연동 미구성 상태로 명확히 남긴다.

## 6. 아직 필요한 외부 설정

- 실제 OpenAI API 키와 사용 가능한 API 결제/크레딧
- S3 호환 스토리지 또는 로컬 MinIO와 실제 버킷
- Google OAuth 웹 클라이언트 ID
- 웹 테스트가 필요하면 S3 CORS에 실제 프론트 오리진 추가
- 배포 주소 확정 후 백엔드 CORS와 스토리지 CORS 동기화

## 7. 다음 백엔드 작업

`PATCH /profiles/me`로 신체 정보를 수정한 뒤 기존 `analysis_summary`를 어떻게 처리할지 정책 결정이 필요하다.

선택지는 다음과 같다.

1. 수정 즉시 AI 요약을 다시 생성한다.
2. 기존 요약을 무효화하고 다음 분석 시 재생성한다.
3. 기존 요약을 유지한다.

비용, 지연, 사용자 기대가 달라지므로 임의로 구현하지 않는다. 팀 결정 후 진행한다.

## 8. 주의사항

- `.env`, JWT 실제 키, OpenAI 키, 스토리지 자격증명은 커밋하지 않는다.
- 사용자 사진 key, URL, 고점 원문을 로그에 남기지 않는다.
- 구독·결제·과금 게이팅은 현재 구현 범위가 아니다.
- frontend 변경은 이 인수인계 범위에 포함되지 않는다.
- 이후 임시 저장소에서 다시 가져올 때도 원본 저장소의 문서와 `backend` 브랜치를 우선한다.
