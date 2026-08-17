import { Image } from 'expo-image';
import { Pressable, StyleSheet } from 'react-native';

const icon = require('../../../assets/figma/login-google.png');

export type GoogleSignInButtonProps = {
  /** Google이 준 ID 토큰. 검증은 서버가 한다. */
  onToken: (idToken: string) => void;
  onError: (message: string) => void;
};

/**
 * 네이티브(iOS·Android)용 자리. <b>아직 동작하지 않는다.</b>
 *
 * 웹은 `GoogleSignInButton.web.tsx`가 Google Identity Services로 실제 로그인을
 * 처리한다. 네이티브는 `@react-native-google-signin/google-signin`이 필요한데
 * 네이티브 모듈이라 Expo Go에서 못 돌고 개발 빌드(prebuild·EAS)가 먼저 있어야 한다.
 *
 * 그때도 <b>웹 클라이언트 ID를 `serverClientId`로 넘겨야</b> ID 토큰의 `aud`가
 * 웹 클라이언트 ID로 유지된다. 백엔드가 audience를 하나만 허용하기 때문이다.
 */
export function GoogleSignInButton({ onError }: GoogleSignInButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Google 로그인"
      style={styles.button}
      onPress={() => onError('Google 로그인은 웹에서 먼저 지원해요. 앱은 준비 중이에요.')}
    >
      <Image source={icon} contentFit="contain" style={styles.icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 38, height: 38 },
});
