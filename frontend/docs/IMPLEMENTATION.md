# 프론트엔드 구현 현황

## 완료

- Expo React Native 57 + TypeScript + Expo Router 초기화
- `src/app`, `components`, `theme`, `services`, `types`, `mocks` 구조
- 온보딩 → 사진 선택 → 고점 선택 기본 이동
- 갤러리 권한 거부, 설정 이동, 사진 미리보기 상태
- 공개 API 주소 환경변수와 mock 분석 데이터
- 타입 검사와 lint 명령

## 가정

- 디자인 원본이 없어 현재 색상, 글꼴 크기, 간격은 임시 토큰이다.
- 앱 식별자는 `com.gojeom.producer`로 확정했다(2026-08-17). 스토어 출시 후에는 변경할 수 없으므로 Google OAuth Android·iOS 클라이언트도 이 값으로 등록한다.
- 사진은 현재 기기 URI로만 다음 단계에 전달할 예정이며 저장·업로드하지 않는다.

## 다음 작업

- 디자인 스펙 반영 및 아이콘·스플래시 자산 추가
- 촬영 기능과 동의 UI 추가
- 분석 로딩/오류/결과/공유 화면 연결
- `API_SPEC.md` 합의 후 실제 업로드 및 분석 API 연결
- Expo Go 실제 기기에서 iOS/Android 핵심 플로우 확인

## 알려진 개발 의존성 경고

- 2026-08-13 기준 `npm audit`은 Expo/Metro 하위 도구 체인에 moderate 8건, high 14건을 보고한다.
- npm의 자동 수정 제안은 현재 SDK 57을 SDK 53/React Native 0.72로 되돌려 호환성을 깨므로 적용하지 않았다.
- 앱 코드가 해당 패키지 API를 직접 호출하지는 않지만, Expo의 후속 패치가 나오면 공식 호환 범위 안에서 업데이트 후 재검사한다.
