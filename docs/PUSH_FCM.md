# 푸시 알림 — FCM 설정

루틴 알림을 **실제로 보내기 위한** 설정. 코드는 다 되어 있고, 여기 적힌 콘솔 작업과
재빌드만 남았다.

## 0. 지금 어디까지 되어 있나

| | 상태 |
| --- | --- |
| 백엔드 발송기 | ✅ `RoutineNotificationSweeper` 1분마다 · `@EnableScheduling` 켜짐 |
| 백엔드 전송 | ✅ `ExpoPushClient` → `exp.host/--/api/v2/push/send` (별도 키 불필요) |
| 기기 토큰 등록 API | ✅ `POST /notifications/device-tokens` |
| 프론트 권한·토큰 | ✅ `services/push.ts` — 알림을 **켤 때** 묻는다 |
| `expo-notifications` 플러그인 | ✅ `app.json` |
| **FCM 자격** | ❌ **여기가 막고 있다** |

안드로이드는 FCM을 거치지 않으면 토큰 자체가 나오지 않는다. 그래서 설정을 켜도
`getExpoPushTokenAsync`가 실패하고, 서버는 보낼 곳을 영영 모른다.

> **iOS는 범위 밖이다.** 유료 개발자 계정($99/년)과 APNs 키가 필요하다.
> 지금 배포 형태는 안드로이드 APK다.

---

## 1. Firebase 프로젝트 (~10분)

[console.firebase.google.com](https://console.firebase.google.com)

1. **기존 Google Cloud 프로젝트에 Firebase를 추가한다.** 새로 만들지 말고, Google
   로그인 클라이언트 ID가 들어 있는 그 프로젝트를 고른다 — 콘솔이 하나로 묶여
   나중에 헤매지 않는다.
2. **Android 앱 추가**
   - 패키지 이름: `com.gojeom.producer` — `app.json`의 `android.package`와 **정확히** 같아야 한다
   - 앱 닉네임·SHA-1: 비워도 된다. **FCM에는 SHA-1이 필요 없다** (그것은 Google 로그인 쪽 이야기다)
3. `google-services.json`을 받아 **`frontend/google-services.json`**에 둔다.

> 이 파일은 `.gitignore` 대상이다 — 저장소가 공개라 넣지 않는다. 그래도 **EAS 빌드에는
> 올라간다**: `.easignore`가 있으면 EAS는 `.gitignore` 대신 그것을 보는데, 거기 적혀
> 있지 않기 때문이다. 팀원이 받아 쓰려면 파일을 따로 전달해야 한다.
>
> 그 방식이 불편하면 EAS 시크릿으로 올려도 된다. `app.config.js`가
> `GOOGLE_SERVICES_JSON` 환경 변수를 먼저 본다.
>
> ```powershell
> npx eas-cli@latest env:create --name GOOGLE_SERVICES_JSON --type file `
>   --value ./google-services.json --visibility secret
> ```

## 2. FCM V1 서비스 계정 키 (~5분)

Expo 서버가 우리 대신 FCM에 밀어 넣으려면 이 키가 필요하다.

Firebase 콘솔 → ⚙ **프로젝트 설정** → **서비스 계정** → **새 비공개 키 생성** → JSON 다운로드.

🔴 **이 JSON은 진짜 비밀이다.** 저장소에 넣지 않는다. 아래에서 EAS에만 올린다.

```powershell
cd C:\AAC_gojeomAI\frontend; npx eas-cli@latest credentials --platform android
```

`Push Notifications (FCM V1)` → `Upload a new service account key` → 방금 받은 JSON.

## 3. 재빌드 (~20분)

```powershell
cd C:\AAC_gojeomAI\frontend; npx eas-cli@latest build --profile preview --platform android
```

| 🔴 | |
| --- | --- |
| **키스토어를 다시 만들지 않는다** | `Set up a new keystore`를 누르면 SHA-1이 바뀌고 **Google 로그인이 조용히 깨진다** |
| `npx eas`가 아니라 `npx eas-cli` | 패키지 이름이 다르다 (N-20) |

## 4. 확인

1. APK를 폰에 깔고 로그인
2. 설정 → **루틴 알림 켜기** → 권한 허용
   - "알림을 받을 수 있어요. 기기가 등록됐어요."가 뜨면 토큰이 서버에 들어간 것이다
   - 회색 안내가 뜨면 그 문구가 사유다 (권한 거절·빌드에 FCM 없음 등)
3. 루틴 화면에서 **알림 시각을 지금부터 2~3분 뒤로** 바꾼다
4. 앱을 **닫고** 기다린다

> **스위퍼는 1분마다 돌고, 지난 10분까지만 인정한다**(`WINDOW_MINUTES`).
> 어제 시각으로 맞추면 오지 않는다.

### 안 올 때 볼 곳

```bash
# 서버 로그 — 발송 시도와 실패 사유가 남는다
journalctl -u gojeom -n 100 --no-pager | grep -i push

# 기기 토큰이 실제로 들어왔나
psql -U gojeom -d gojeom -c "select platform, left(token, 24), created_at from device_tokens order by created_at desc limit 5;"
```

| 증상 | 볼 것 |
| --- | --- |
| 토큰 자체가 안 들어옴 | 1·2번(FCM 자격)이 빠졌거나 재빌드를 안 했다 |
| 토큰은 있는데 안 옴 | 알림 시각·`WINDOW_MINUTES`·서버 시계(KST 판정) |
| `DeviceNotRegistered` | 앱을 지웠다 깔면 토큰이 바뀐다. 다시 켜면 새로 등록된다 |

---

## 왜 잠금 화면에 목표 이름이 없나

일부러 뺐다. 목표 이름은 AI가 짓는데 "모공 정돈과 생활 리듬을 함께 다듬기"처럼 나올 수
있고, 그것이 잠금 화면에 뜨면 **남이 볼 수 있는 자리에 피부·건강 상태가 드러난다.**
얼굴 사진과 건강 정보를 민감정보로 따로 동의받는 서비스가 알림으로 그것을 흘리면
안 된다. 열어야 보이게 한다. (`RoutineNotificationSweeper` 주석 · PRD G-1)
