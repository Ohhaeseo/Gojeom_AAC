import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { NativeModules, Pressable, StyleSheet, TurboModuleRegistry } from 'react-native';

import { googleWebClientId } from '@/services/googleClient';

const icon = require('../../../assets/figma/login-google.png');

export type GoogleSignInButtonProps = {
  /** Google이 준 ID 토큰. 검증은 서버가 한다. */
  onToken: (idToken: string) => void;
  onError: (message: string) => void;
};

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');

/**
 * 🔴 네이티브 모듈을 <b>최상단에서 import하지 않는다.</b>
 *
 * <p>이 모듈은 불러오는 순간 {@code TurboModuleRegistry.getEnforcing('RNGoogleSignin')}을
 * 실행하고, 네이티브 바이너리에 없으면 <b>그 자리에서 던진다.</b> 최상단 import는
 * 그 예외를 파일 로딩 시점에 터뜨려 <b>{@code login.tsx}·{@code signup.tsx}를 통째로
 * 죽인다</b> — 로그인 화면이 아예 뜨지 않고 expo-router는 "default export가 없다"고
 * 말한다. 실제로 그렇게 물렸다.
 *
 * <p>Expo Go만의 이야기가 아니다. 실제 앱에서도 링크가 어긋나면 <b>이메일 로그인까지
 * 못 쓰게 된다.</b> Google 버튼 하나가 안 되는 것과 로그인 화면 전체가 없는 것은
 * 전혀 다른 사고다.
 *
 * <p>그래서 <b>누를 때</b> 불러오고, 없으면 문구로 알린다.
 */
function loadGoogleSignin(): GoogleSigninModule | null {
  if (!hasNativeGoogleSignin()) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-google-signin/google-signin') as GoogleSigninModule;
  } catch {
    return null;
  }
}

/**
 * 네이티브 쪽에 실제로 등록돼 있는지. <b>불러오기 전에</b> 묻는다.
 *
 * <p>{@code try/catch}로 감싸는 것만으로는 부족했다. Metro의 모듈 로더는 평가 중에
 * 난 예외를 <b>스스로 붙잡아 LogBox에 치명적 오류로 보고</b>하고 {@code undefined}를
 * 돌려준다. 우리 {@code catch}는 돌지 않는데 <b>빨간 화면은 그대로 뜬다.</b>
 * 실제로 그렇게 물렸다 — 화면은 살아 있는데 오류 화면이 덮는다.
 *
 * <p>그래서 {@code getEnforcing}(없으면 던진다) 대신 {@code get}(없으면 null)으로
 * 먼저 확인하고, 있을 때만 불러온다. 던질 일이 없으니 보고될 것도 없다.
 */
function hasNativeGoogleSignin(): boolean {
  try {
    return TurboModuleRegistry.get('RNGoogleSignin') != null
        || NativeModules.RNGoogleSignin != null;
  } catch {
    return false;
  }
}

/**
 * 네이티브(Android·iOS)용 Google 로그인 버튼.
 *
 * <p>웹은 {@code GoogleSignInButton.web.tsx}가 Google Identity Services로 처리한다.
 * 네이티브는 네이티브 모듈이라 <b>Expo Go에서 돌지 않는다</b> — 개발 빌드나
 * EAS 빌드가 있어야 한다.
 *
 * <p>🔴 <b>`webClientId`에 웹 클라이언트 ID를 넘기는 것이 핵심이다.</b> 안드로이드
 * 클라이언트 ID를 넣으면 ID 토큰의 `aud`가 안드로이드 클라이언트로 발급되는데,
 * 백엔드 `GoogleTokenVerifier`가 `setAudience`에 <b>웹 클라이언트 ID 하나만</b>
 * 넣어 두어 그 토큰을 거절한다. 안드로이드 클라이언트는 Google 콘솔에 등록만 해
 * 두면 되고(패키지명 + SHA-1), 코드에서 그 ID를 쓰지는 않는다.
 */
export function GoogleSignInButton({ onToken, onError }: GoogleSignInButtonProps) {
  const [busy, setBusy] = useState(false);

  // 콜백을 ref에 담아 눌린 뒤 부모가 리렌더돼도 옛 콜백을 부르지 않게 한다.
  const handlers = useRef({ onToken, onError });
  handlers.current = { onToken, onError };

  const signIn = async () => {
    if (busy) return;

    const google = loadGoogleSignin();
    if (!google) {
      handlers.current.onError('이 방식은 설치한 앱에서만 동작해요. 웹에서는 Google 로그인을 쓸 수 있어요.');
      return;
    }
    if (!googleWebClientId) {
      handlers.current.onError('Google 로그인이 아직 설정되지 않았어요.');
      return;
    }

    setBusy(true);
    try {
      const { GoogleSignin } = google;
      GoogleSignin.configure({ webClientId: googleWebClientId });
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      const response = await GoogleSignin.signIn();
      // v13+는 취소를 예외가 아니라 `type: 'cancelled'`로 알린다. 취소는 오류가
      // 아니므로 빨간 문구를 띄우지 않고 조용히 돌아간다.
      if (response.type === 'cancelled') return;

      const idToken = response.data?.idToken;
      if (!idToken) {
        // webClientId가 비어 있거나 콘솔의 SHA-1이 이 빌드와 다를 때 여기로 온다.
        handlers.current.onError('Google에서 로그인 정보를 받지 못했어요. 잠시 후 다시 시도해주세요.');
        return;
      }
      handlers.current.onToken(idToken);
    } catch (error) {
      const message = messageOf(error, google.statusCodes);
      if (message) handlers.current.onError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Google 로그인"
      accessibilityState={{ disabled: busy }}
      style={styles.button}
      onPress={signIn}
    >
      <Image source={icon} contentFit="contain" style={styles.icon} />
    </Pressable>
  );
}

/**
 * 사용자에게 보일 말로 옮긴다. 빈 문자열이면 아무 말도 하지 않는다.
 *
 * <p><b>원문 오류를 그대로 띄우지 않는다.</b> 영어인 데다 클라이언트 ID 같은 설정값이
 * 섞여 나올 수 있다. 사용자가 할 수 있는 일만 말한다.
 */
function messageOf(error: unknown, statusCodes: GoogleSigninModule['statusCodes']): string {
  const code = (error as { code?: string })?.code;

  if (code === statusCodes.SIGN_IN_CANCELLED) return '';
  if (code === statusCodes.IN_PROGRESS) return '로그인을 진행하고 있어요. 잠시만 기다려주세요.';
  if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    return 'Google Play 서비스가 필요해요. 업데이트한 뒤 다시 시도해주세요.';
  }
  return 'Google 로그인에 실패했어요. 잠시 후 다시 시도해주세요.';
}

const styles = StyleSheet.create({
  button: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 38, height: 38 },
});
