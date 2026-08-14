<div align="center">

# ✨ GO. (고점)

### 남을 닮지 말고, 나다운 분위기의 고점으로.

[![Project](https://img.shields.io/badge/Project-LIKELION%2014th%20Hackathon-FF7710?style=flat-square)](https://likelion.net/)
![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Expo-111111?style=flat-square)
![Status](https://img.shields.io/badge/Status-MVP%20Development-7C3AED?style=flat-square)

</div>

## 💡 어떤 서비스인가요?

**GO. (고점)**은 사용자의 현재 사진·신체 정보와 원하는 **고점**(이상적인 자기 이미지)을 AI로 비교 분석해,  
나에게 자연스럽게 어울리는 **변화 전략과 실행 가능한 목표**를 제공하는 AI 기반 이미지 전략 서비스입니다.

단순히 다른 사람의 모습을 따라 하는 대신, 원하는 분위기를 피부·체형·건강 요소로 나누고 **지금의 나에게 적용할 방법**을 알려줍니다.

## 🚀 핵심 경험

```text
📷 내 사진 · 우선순위 · 신체 정보 등록
        ↓
✍️ 고점 입력 (텍스트 + 참고 사진)
        ↓
🏷️ AI 키워드 추출 및 선택
        ↓
🪞 현재 ↔ 고점 비교 + 카테고리별 변화 제안
        ↓
🗂️ 서랍에 저장 → 맞춤형 목표로 설정
```

## 🌟 주요 기능

- 사진 · 우선순위(피부/체형/건강) · 신체 정보 기반 프로필 생성
- 인바디 서류 카메라 스캔 자동 입력
- 텍스트와 참고 사진으로 고점 입력
- AI 키워드 추출 후 **사용자가 직접 선택**
- 현재 ↔ 고점 좌우 비교 이미지
- 카테고리별 변화 제안과 오늘 해볼 관리
- 서랍 저장, 맞춤형 목표 생성과 완료 체크

## 🧭 서비스 원칙

> 외모를 점수화하거나 타인의 얼굴을 복제하지 않습니다.

- **평가보다 해석** — 결점이 아닌 분위기 구성 요소를 설명합니다.
- **복제보다 적용** — 참고 이미지의 스타일(헤어·피부 상태·분위기)을 나에게 맞게 적용합니다. 그 사람의 얼굴이 되지는 않습니다.
- **이미지보다 행동** — 실제로 시도할 수 있는 변화 순서를 제안합니다.
- **사용자 선택 우선** — AI 추천보다 사용자의 선택을 우선합니다.

## 🛠️ 기술 구성

| 영역 | 기술 |
| --- | --- |
| Frontend | Expo React Native · TypeScript · Expo Router |
| Backend | Spring Boot 3.x · Spring Data JPA · REST API |
| Database | PostgreSQL 16 · Flyway |
| Storage | S3 호환 오브젝트 스토리지 (국내 리전) |
| AI | OpenAI API · Structured Outputs · Image Edit |
| Image Validation | MediaPipe Face Detector |

## 📚 문서

| 문서 | 내용 |
| --- | --- |
| [AGENTS.md](AGENTS.md) | **작업 시작점** — 파일 구조 · 필수 규칙 |
| [PRD.md](PRD.md) | 제품 요구사항 · 유저플로우 · 기능 정의 |
| [design.md](design.md) | 디자인 토큰 · 컴포넌트 · 화면 레이아웃 |
| [API.md](API.md) | Frontend ⇄ Backend API 계약 |
| [ERD.md](ERD.md) | 데이터 모델 · 스키마 |
| [frontend/ARCHITECTURE.md](frontend/ARCHITECTURE.md) | 프론트 구조 · 라우팅 · API 계층 |
| [backend/ARCHITECTURE.md](backend/ARCHITECTURE.md) | 백엔드 기술 아키텍처 · 패키지 구조 |

디자인 시안은 [Figma 원본](https://www.figma.com/design/8AX19ImZG4ou6jqCwU0tPJ/GO.)이 정본입니다. 전체 디자인 export는 저장소에 포함하지 않으며, 앱 실행에 필요한 로고·아이콘·폰트만 `frontend/assets`에서 버전 관리합니다.

## 📁 구조

```text
├─ frontend/    Expo React Native · TypeScript (작업 브랜치: frontend)
└─ backend/     Spring Boot             (작업 브랜치: backend)
```

## 🦁 프로젝트 정보

- **멋쟁이사자처럼 대학 14기 중앙 해커톤**
- **주제 기업:** AAC (Anti-Aging Club)
- **팀:** 뚝딱이들

---

<div align="center">
  <sub>AI 분석과 생성 이미지는 스타일 탐색을 위한 참고용이며, 실제 결과를 보장하거나 의료적 진단을 제공하지 않습니다.</sub>
</div>
