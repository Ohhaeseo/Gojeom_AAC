/**
 * Google 클라이언트 ID — 웹과 네이티브가 **함께** 쓰는 설정.
 *
 * 웹은 이 값으로 GIS 버튼을 그리고(`googleWeb.ts`), 네이티브는 이 값을
 * `GoogleSignin.configure({ webClientId })`에 넘긴다(`GoogleSignInButton.tsx`).
 *
 * 🔴 **네이티브도 "웹" 클라이언트 ID를 쓴다.** 안드로이드 클라이언트 ID를 넘기면
 * ID 토큰의 `aud`가 안드로이드 클라이언트로 발급되는데, 백엔드
 * `GoogleTokenVerifier`가 `setAudience`에 **이 값 하나만** 넣어 두어 거절한다.
 * 안드로이드 클라이언트는 Google 콘솔에 등록만 해 두면 되고(패키지명 + SHA-1),
 * 코드에서 그 ID를 직접 쓰지는 않는다.
 *
 * **빌드 시점에 번들로 구워진다.** 값을 바꾸면 다시 빌드해야 한다.
 */
export const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

/** 백엔드 `GoogleOAuthProperties.isConfigured()`와 같은 판정을 쓴다. */
export const isGoogleConfigured = () => googleWebClientId.endsWith('.apps.googleusercontent.com');
