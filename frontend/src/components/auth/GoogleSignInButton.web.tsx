import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { isGoogleConfigured, mountGoogleButton } from '@/services/googleWeb';

import type { GoogleSignInButtonProps } from './GoogleSignInButton';

const icon = require('../../../assets/figma/login-google.png');

/**
 * 웹용 Google 로그인 버튼.
 *
 * 시안의 아이콘을 그리고, 그 위에 Google이 그린 진짜 버튼을 <b>투명하게</b> 얹는다.
 * 우리가 클릭을 흉내 내지 않고 사용자가 Google의 버튼을 직접 누르게 하려는 것이다.
 * 크기를 아이콘과 맞춰야 옆 버튼의 눌림 영역을 덮지 않는다. (오답 노트 N-11과 같은 함정)
 */
export function GoogleSignInButton({ onToken, onError }: GoogleSignInButtonProps) {
  const hostRef = useRef<View | null>(null);
  const [ready, setReady] = useState(false);

  // 콜백을 ref에 담아 effect가 부모의 리렌더마다 다시 도는 것을 막는다.
  // 다시 돌면 Google 버튼이 매번 새로 그려진다.
  const handlers = useRef({ onToken, onError });
  handlers.current = { onToken, onError };

  useEffect(() => {
    const host = hostRef.current as unknown as HTMLElement | null;
    if (!host) return;

    let cancelled = false;
    mountGoogleButton(host, (idToken) => {
      if (!cancelled) handlers.current.onToken(idToken);
    })
      .then(() => { if (!cancelled) setReady(true); })
      .catch((error: unknown) => {
        if (cancelled) return;
        handlers.current.onError(error instanceof Error ? error.message : 'Google 로그인을 시작하지 못했어요.');
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <View style={styles.wrap}>
      <Image source={icon} contentFit="contain" style={styles.icon} pointerEvents="none" />
      {/* Google 버튼이 아직 안 떴으면 아이콘이 먹통으로 보이지 않게 이유를 알려준다. */}
      {ready ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Google 로그인"
          style={StyleSheet.absoluteFill}
          onPress={() => handlers.current.onError(
            isGoogleConfigured()
              ? 'Google 로그인을 준비하고 있어요. 잠시 후 다시 눌러주세요.'
              : 'Google 로그인이 아직 설정되지 않았어요.',
          )}
        />
      )}
      <View ref={hostRef} style={[styles.host, ready ? styles.hostReady : styles.hostHidden]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 38, height: 38 },
  // Google의 iframe을 아이콘 위에 정확히 겹친다. 넘치는 부분은 잘라서
  // 옆 버튼(네이버·전화)의 눌림 영역을 침범하지 않게 한다.
  host: { position: 'absolute', width: 52, height: 52, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  hostReady: { opacity: 0 },
  // 준비 전에는 눌림을 위의 Pressable이 받아야 하므로 아예 비켜둔다.
  hostHidden: { opacity: 0, pointerEvents: 'none' },
});
