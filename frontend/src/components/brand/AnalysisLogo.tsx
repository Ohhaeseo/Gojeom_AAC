import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

import { OfficialFaceLogo } from './OfficialLogos';

type AnalysisLogoProps = { completed: boolean; size?: number };

export function AnalysisLogo({ completed, size = 150 }: AnalysisLogoProps) {
  const [flipScale] = useState(() => new Animated.Value(1));
  const [wink] = useState(() => new Animated.Value(completed ? 1 : 0));
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (completed || reduceMotion) return;
    flipScale.setValue(1);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(flipScale, { toValue: 0.06, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(flipScale, { toValue: 1, duration: 290, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(flipScale, { toValue: 0.06, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(flipScale, { toValue: 1, duration: 290, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [completed, flipScale, reduceMotion]);

  useEffect(() => {
    if (!completed) {
      wink.setValue(0);
      if (reduceMotion) flipScale.setValue(1);
      return;
    }

    const transition = Animated.sequence([
      Animated.timing(flipScale, { toValue: 1, duration: reduceMotion ? 0 : 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(wink, { toValue: 1, duration: reduceMotion ? 0 : 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    transition.start();
    return () => transition.stop();
  }, [completed, flipScale, reduceMotion, wink]);

  const loadingOpacity = wink.interpolate({ inputRange: [0, 0.55, 1], outputRange: [1, 0.22, 0] });
  const winkOpacity = wink.interpolate({ inputRange: [0, 0.28, 1], outputRange: [0, 0.52, 1] });
  const winkScale = wink.interpolate({ inputRange: [0, 0.72, 1], outputRange: [0.96, 1.025, 1] });
  const winkRotation = wink.interpolate({ inputRange: [0, 0.72, 1], outputRange: ['-1.5deg', '0.7deg', '0deg'] });
  const winkY = wink.interpolate({ inputRange: [0, 0.72, 1], outputRange: [2, -0.5, 0] });

  return (
    <View accessibilityLabel={completed ? '분석 완료 윙크 로고' : '팽이처럼 회전하는 분석 중 로고'} style={[styles.box, { maxWidth: size, maxHeight: size }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: loadingOpacity, transform: reduceMotion ? [] : [{ scaleX: flipScale }] }]}><OfficialFaceLogo size={size} style={styles.fill} /></Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: winkOpacity, transform: reduceMotion ? [] : [{ translateY: winkY }, { rotate: winkRotation }, { scale: winkScale }] }]}><OfficialFaceLogo size={size} variant="wink" style={styles.fill} /></Animated.View>
    </View>
  );
}

/*
  🔴 크기를 픽셀로 박지 않는다.

  이 로고가 들어가는 `AnalysisPanel`은 `overflow: hidden`이다. 고정 크기로 두면 남은
  높이가 모자랄 때 **로고 머리가 잘려 나간다.** 실측 — 320dp 화면에서 글꼴 크기를
  '크게'(fontScale 1.3)로 두면 위로 25px이 날아갔다. 상태 문구가 세 줄로 늘어나도 같다.

  `flex: 1`이라 로고가 **남은 높이만 가져간다.** 글이 길어지면 로고가 먼저 작아지고,
  넉넉하면 `maxHeight`(원래 크기)까지만 커진다. 잘릴 자리가 생기지 않는다.
*/
const styles = StyleSheet.create({
  // `aspectRatio`가 정사각형을 지켜 찌그러지지 않게 한다.
  box: { flex: 1, aspectRatio: 1, minHeight: 48, alignSelf: 'center' },
  // 크기는 위 `box`가 정하고 SVG는 그것을 채운다. `OfficialFaceLogo`의 기본
  // `width`/`height`를 덮어쓰는 자리라 **style이 뒤에 오는 것**에 기대고 있다.
  fill: { width: '100%', height: '100%' },
});
