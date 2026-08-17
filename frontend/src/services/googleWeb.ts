/**
 * 웹 전용 Google Identity Services(GIS) 연동.
 *
 * <b>이 파일은 웹에서만 불린다.</b> 네이티브는 `GoogleSignInButton.tsx`가 대신
 * 받는다. 네이티브 모듈이 아니라 순수 DOM이라 Expo Go·브라우저에서 그대로 돈다.
 *
 * GIS가 콜백으로 주는 `credential`이 곧 ID 토큰이다. 이 토큰의 `aud`는 여기
 * 쓰는 클라이언트 ID와 같고, 백엔드 `GoogleTokenVerifier`가 같은 값 하나만
 * audience로 허용한다. 그래서 프론트·백엔드가 **반드시 같은 웹 클라이언트 ID**를
 * 써야 한다.
 */

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

export const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

/** 백엔드 `GoogleOAuthProperties.isConfigured()`와 같은 판정을 쓴다. */
export const isGoogleConfigured = () => googleWebClientId.endsWith('.apps.googleusercontent.com');

type GoogleIdApi = {
  accounts: {
    id: {
      initialize: (config: Record<string, unknown>) => void;
      renderButton: (host: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
};

const api = () => (globalThis as unknown as { google?: GoogleIdApi }).google;

// 스크립트는 문서에 한 번만 붙인다. 화면을 오가며 버튼이 여러 번 마운트돼도
// 같은 약속을 재사용한다.
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof document === 'undefined') return Promise.reject(new Error('브라우저가 아니에요.'));
  if (api()) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const element = document.createElement('script');
    element.src = SCRIPT_SRC;
    element.async = true;
    element.defer = true;
    element.onload = () => (api() ? resolve() : reject(new Error('Google 로그인을 불러오지 못했어요.')));
    element.onerror = () => {
      // 다음 시도에서 다시 붙일 수 있게 실패한 약속은 버린다.
      scriptPromise = null;
      reject(new Error('Google 로그인을 불러오지 못했어요. 연결을 확인해주세요.'));
    };
    document.head.appendChild(element);
  });
  return scriptPromise;
}

/**
 * `host` 안에 Google이 그리는 진짜 버튼을 넣는다.
 *
 * <b>우리가 클릭을 흉내 내지 않는다.</b> 시안의 아이콘을 아래 깔고 이 버튼을
 * 투명하게 위에 얹어서, 사용자가 누르는 것이 Google의 버튼 자신이 되게 한다.
 * 크기를 맞춰야 옆 버튼(네이버·전화)의 눌림 영역을 가리지 않는다.
 */
export async function mountGoogleButton(host: HTMLElement, onToken: (idToken: string) => void): Promise<void> {
  if (!isGoogleConfigured()) throw new Error('Google 로그인이 아직 설정되지 않았어요.');
  await loadScript();

  const google = api();
  if (!google) throw new Error('Google 로그인을 불러오지 못했어요.');

  google.accounts.id.initialize({
    client_id: googleWebClientId,
    // 팝업으로 받는다. 리디렉션 방식이 아니라서 콘솔에 리디렉션 URI를 넣지 않아도 된다
    // (승인된 JavaScript 원본만 있으면 된다).
    ux_mode: 'popup',
    callback: (response: { credential?: string }) => {
      if (response?.credential) onToken(response.credential);
    },
  });

  host.replaceChildren();
  google.accounts.id.renderButton(host, { type: 'icon', shape: 'circle', theme: 'outline', size: 'large' });
}
