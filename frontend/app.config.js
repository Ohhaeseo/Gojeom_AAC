/**
 * `app.json` 위에 **빌드 시점 값**만 얹는다.
 *
 * 🔴 `google-services.json`을 저장소에 넣지 않으려고 있다. 이 저장소는 공개라
 * (루트 `.gitignore` 첫 줄) 키가 한 번 올라가면 되돌릴 수 없다. FCM 클라이언트
 * 설정은 그 자체로 치명적인 비밀은 아니지만, 여기 규칙을 예외로 두지 않는다.
 *
 * **EAS 빌드** — 파일을 시크릿으로 올려 두면 EAS가 빌드 머신에 풀어 주고 그 경로를
 * `GOOGLE_SERVICES_JSON`에 넣어 준다. 아래가 그 값을 집어 온다.
 *
 * ```
 * npx eas-cli@latest env:create --name GOOGLE_SERVICES_JSON  *   --type file --value ./google-services.json --environment production --visibility secret
 * ```
 *
 * **로컬** — `frontend/google-services.json`에 그냥 두면 된다(gitignore 대상).
 *
 * 🔴 <b>파일이 없으면 안드로이드 빌드가 실패한다.</b> `expo-notifications`가 FCM에
 * 등록하려면 이 파일이 있어야 한다. 웹·개발 서버는 이 파일 없이도 그대로 돈다.
 */
const fs = require('fs');
const path = require('path');

const LOCAL = './google-services.json';

function googleServicesFile() {
  // EAS 시크릿이 우선. 없으면 로컬 파일, 그것도 없으면 키를 아예 넣지 않는다 —
  // 없는 경로를 적어 두면 "파일을 찾을 수 없다"로 빌드가 죽는다.
  if (process.env.GOOGLE_SERVICES_JSON) return process.env.GOOGLE_SERVICES_JSON;
  return fs.existsSync(path.join(__dirname, LOCAL)) ? LOCAL : undefined;
}

module.exports = ({ config }) => {
  const file = googleServicesFile();
  return {
    ...config,
    android: { ...config.android, ...(file ? { googleServicesFile: file } : {}) },
  };
};
