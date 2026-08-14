# GO. 시뮬레이션 실행 가이드

이 문서는 개발 PC에서 iPhone의 Expo Go로 GO. 프론트엔드를 실행하는 방법을 설명합니다.

## 1. 준비물

- Node.js `24.15.0` (`.nvmrc`, `.node-version`에 고정)
- npm
- 최신 Expo Go가 설치된 iPhone
- 개발 PC와 iPhone이 연결된 동일한 Wi-Fi

Expo Go가 오래된 버전이면 `Project is incompatible with this version of Expo Go` 오류가 나타납니다. App Store에서 Expo Go를 먼저 업데이트하세요.

## 2. 최초 설치

저장소를 처음 받는 경우:

```bash
git clone https://github.com/Ohhaeseo/Gojeom_AAC.git
cd Gojeom_AAC
git switch frontend
cd frontend
```

Windows PowerShell:

```powershell
npm ci
Copy-Item .env.example .env
```

macOS / Linux:

```bash
npm ci
cp .env.example .env
```

백엔드가 아직 없거나 프론트 화면만 확인할 때는 기본 `.env.example`을 그대로 복사하면 mock 모드로 실행됩니다.

```env
# EXPO_PUBLIC_API_BASE_URL=
```

백엔드 개발 서버를 연결할 때는 iPhone에서 접근 가능한 주소를 사용합니다. iPhone에서 `localhost`는 PC가 아니라 iPhone 자신을 가리킵니다.

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.0.10:8080/api/v1
```

## 3. QR로 iPhone에서 실행

```powershell
npm run start
```

캐시를 비우고 시작하려면 다음을 사용합니다.

```powershell
npx expo start -c
```

1. 터미널에 QR 코드가 나타날 때까지 기다립니다.
2. iPhone 카메라로 QR 코드를 스캔합니다.
3. 상단 배너를 눌러 Expo Go로 엽니다.
4. 첫 번들 다운로드가 끝날 때까지 앱을 닫지 않습니다.

## 4. 같은 Wi-Fi에서 연결되지 않을 때

Metro 화면에서 연결 방식을 `LAN`으로 확인합니다. 회사·학교 Wi-Fi처럼 기기 간 통신을 막는 환경이면 휴대폰 핫스팟을 사용하거나 tunnel 모드로 실행합니다.

```powershell
npx expo start --tunnel -c
```

tunnel은 최초 연결이 느릴 수 있습니다. Windows 방화벽 확인 창이 뜨면 Node.js의 개인 네트워크 접근을 허용해야 QR 연결이 됩니다.

## 5. 웹에서 빠르게 확인

iPhone 전용 동작과 레이아웃의 최종 검수는 Expo Go에서 해야 하지만, 화면 이동을 빠르게 확인할 때는 웹을 사용할 수 있습니다.

```powershell
npm run web
```

카메라, 갤러리 권한, Safe Area, 키보드, iOS 애니메이션은 웹과 다르게 동작할 수 있습니다.

## 6. 자주 발생하는 문제

### 검은 화면 또는 흰 화면만 보임

1. 실행 중인 Metro를 `Ctrl+C`로 종료합니다.
2. `npx expo start -c`로 다시 시작합니다.
3. Expo Go의 최근 프로젝트에서 앱을 닫았다가 QR을 다시 스캔합니다.
4. 터미널의 빨간 오류와 iPhone의 오류 화면을 확인합니다.
5. 그래도 안 되면 의존성을 다시 설치합니다.

```powershell
Remove-Item -Recurse -Force node_modules
npm ci
npx expo start -c
```

`node_modules` 삭제는 반드시 `frontend` 폴더 안에서만 실행하세요.

### Expo Go 버전 호환 오류

- App Store에서 Expo Go를 업데이트합니다.
- 이 프로젝트는 Expo SDK 54를 사용합니다.
- 업데이트할 수 없는 기기에서는 Expo Development Build가 필요할 수 있습니다.

### QR을 스캔해도 열리지 않음

- PC와 iPhone이 같은 Wi-Fi인지 확인합니다.
- VPN을 양쪽 모두 끕니다.
- Windows 방화벽에서 Node.js 개인 네트워크를 허용합니다.
- `npx expo start --tunnel -c`를 시도합니다.

### 백엔드만 연결되지 않음

- `.env` 변경 뒤 Metro를 완전히 재시작합니다.
- Base URL 끝에 `/api/v1`이 한 번만 들어갔는지 확인합니다.
- iPhone Safari에서 API 호스트에 접근 가능한지 확인합니다.
- `localhost` 대신 개발 PC의 LAN IP 또는 HTTPS 개발 주소를 사용합니다.
- 서버가 iPhone의 요청을 허용하고 있는지 확인합니다.

### 다른 계정의 데모 데이터가 남아 있음

현재 mock 모드는 AsyncStorage를 사용합니다. Expo Go에서 프로젝트 데이터를 초기화하거나 앱의 계정 삭제 흐름을 사용한 뒤 다시 실행합니다. 실제 백엔드 연결 후에는 데이터가 반드시 사용자 ID별로 격리되어야 합니다.

### 사진 선택이 안 됨

iPhone의 `설정 → Expo Go → 사진`에서 접근 권한을 허용합니다. 카메라 촬영도 같은 화면에서 카메라 권한을 확인합니다.

## 7. 코드 검사

PR 또는 시연 전에 아래 명령이 모두 통과해야 합니다.

```powershell
npm run typecheck
npm run lint
```

필요하면 웹 번들도 확인합니다.

```powershell
npx expo export --platform web --output-dir dist-check
```

`dist-check`, `.expo`, `node_modules`, `.env`, 로그 파일은 Git에 올리지 않습니다.

## 8. 시연 권장 순서

1. 앱 실행 로고 전환
2. 회원가입 또는 로그인
3. 이름·사진·우선순위·신체/선택 정보 등록
4. 프로필 분석 완료 후 홈 이동
5. 고점 입력과 참고 사진 추가
6. 키워드 선택 후 결과 확인
7. 결과 저장 → 서랍 → 맞춤형 목표 생성
8. 루틴 완료 체크와 진행률 확인
9. 프로필·설정·삭제 모달 확인

시연 전에는 `npx expo start -c`로 새 번들을 띄우고 iPhone에서 한 번 전체 흐름을 확인하는 것을 권장합니다.
