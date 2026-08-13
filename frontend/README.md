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

## 구조 · 아키텍처

**[ARCHITECTURE.md](ARCHITECTURE.md)** 가 정본이다. 디렉터리 구조, 라우팅, API 계층, 분석 폴링, 디자인 토큰 적용 방식을 담고 있다.

```text
frontend/src/
├─ app/       라우터 · 프로바이더
├─ pages/     라우트 = 시안 화면과 1:1
├─ features/  도메인 로직 (auth · profile · analysis · drawer · routine)
└─ shared/    api · ui · layout · hooks · lib · styles
```

특히 아래 두 가지는 구현 전에 읽어야 한다.

- **§6 분석 진행 폴링** — `KEYWORDS_READY`에서 멈추지 않기, `DONE` 이후 이미지 폴링 유지
- **§3 shared/ui 대응표** — design.md §4 컴포넌트와 파일이 1:1로 매핑된다

## 구현 시 반드시 지킬 것

[API.md](../API.md) 부록 B의 체크리스트 13항목을 따른다. 특히:

- 이미지 업로드는 presigned URL로 **스토리지에 직접 PUT**한다. 서버로 multipart를 보내지 않는다.
- 조회용 이미지 URL은 **10분 만료**다. 캐시하거나 localStorage에 저장하지 않는다.
- 분석 진행은 `GET /analyses/{id}` **단일 폴링**으로만 추적한다(상한 60초). `KEYWORDS_READY`에서도 폴링을 멈추지 않는다.
- 결과 화면의 `disclaimer`는 **상시 노출**하며 숨기거나 접지 않는다.
- `viewState`(`FRESH`/`SAVED`)로 결과 화면의 칩 형태·CTA·활성 탭을 분기한다.
- `priorities`는 **배열 순서가 곧 순위**다. 정렬을 바꾸지 않는다.
- **점수·등급·순위 형태의 UI를 만들지 않는다.** (PRD §1.6 서비스 원칙)

## 디자인

토큰과 컴포넌트는 [design.md](../design.md)를 따른다. 시안 원본은 `assets/images/UI/`에 있으며, 문서와 시안이 다르면 **시안이 우선**이다(design.md §13).

`(근사)` 표기된 수치는 export 이미지에서 판독한 값이므로 Figma 실측값으로 교체가 필요하다.

## 관련 문서

- [ARCHITECTURE.md](ARCHITECTURE.md) — **프론트 구조 · 라우팅 · API 계층 · 폴링**
- [PRD.md](../PRD.md) — 제품 요구사항
- [design.md](../design.md) — 디자인 토큰 · 컴포넌트 · 화면 레이아웃
- [API.md](../API.md) — API 계약 (요청/응답 · Enum · 에러 코드)
- [ERD.md](../ERD.md) — 데이터 모델
