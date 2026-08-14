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
    <View accessibilityLabel={completed ? '분석 완료 윙크 로고' : '팽이처럼 회전하는 분석 중 로고'} style={{ width: size, height: size }}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: loadingOpacity, transform: reduceMotion ? [] : [{ scaleX: flipScale }] }]}><OfficialFaceLogo size={size} /></Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: winkOpacity, transform: reduceMotion ? [] : [{ translateY: winkY }, { rotate: winkRotation }, { scale: winkScale }] }]}><OfficialFaceLogo size={size} variant="wink" /></Animated.View>
    </View>
  );
}
