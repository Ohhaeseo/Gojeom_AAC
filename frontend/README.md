# GO. — Frontend

React · TypeScript 기반 모바일 웹 클라이언트.

## 기술 스택

| 영역 | 선택 |
| --- | --- |
| Framework | React 18 · TypeScript |
| Build | Vite |
| 라우팅 | React Router |
| 서버 상태 | TanStack Query (분석 상태 폴링에 사용) |
| 스타일 | 미정 (Tailwind CSS 또는 CSS Modules) |
| 이미지 검증 | MediaPipe Face Detector (업로드 1차 검증) |

## 작업 브랜치

이 폴더의 작업은 `frontend` 브랜치에서 진행한다.

```bash
git switch frontend
```

## 폴더 구조 (계획)

```text
frontend/
├─ src/
│  ├─ pages/          # 화면 단위 (온보딩 · 프로필 등록 · 추구미 입력 · 결과 · 루틴)
│  ├─ components/     # 재사용 UI
│  ├─ features/       # 도메인별 로직 (analysis, routine, subscription)
│  ├─ api/            # API 클라이언트 · 타입 정의
│  ├─ hooks/
│  └─ styles/
└─ public/
```

## 구현 시 반드시 지킬 것

[API.md](../API.md) 부록 B의 체크리스트를 따른다. 특히:

- 이미지 업로드는 presigned URL로 **스토리지에 직접 PUT**한다. 서버로 multipart를 보내지 않는다.
- 조회용 이미지 URL은 **10분 만료**다. 캐시하거나 localStorage에 저장하지 않는다.
- 분석 진행은 `GET /analyses/{id}` **단일 폴링**으로만 추적한다. (상한 60초)
- 결과 화면의 `disclaimer`는 **상시 노출**하며 숨기거나 접지 않는다.
- **점수·등급·순위 형태의 UI를 만들지 않는다.** (PRD §1.5 서비스 원칙)

## 관련 문서

- [PRD.md](../PRD.md) — 제품 요구사항
- [API.md](../API.md) — API 계약 (요청/응답 스펙 · Enum · 에러 코드)
- [ERD.md](../ERD.md) — 데이터 모델
