import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { transparentFacePaths } from './OfficialLogos';

const CANVAS_WIDTH = 220;
const CANVAS_HEIGHT = 160;

function OfficialLetter({ letter }: { letter: 'g' | 'o' }) {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}>
      <Path
        d={transparentFacePaths[letter]}
        fill="#121D2D"
        fillRule="evenodd"
        clipRule="evenodd"
        transform="translate(28 17)"
      />
    </Svg>
  );
}

function OfficialMouth() {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}>
      <Path d={transparentFacePaths.mouth} transform="translate(28 17)" fill="none" stroke="#6BBDA6" strokeWidth={6.94809} />
      <Path d={transparentFacePaths.arrow} transform="translate(28 17)" fill="none" stroke="#6BBDA6" strokeWidth={6.94809} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function MorphingBrandLogo() {
  const [progress] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, delay: reduceMotion ? 250 : 420, duration: reduceMotion ? 0 : 1550, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start();
  }, [progress, reduceMotion]);

  const spread = progress.interpolate({ inputRange: [0, 0.12, 0.86, 1], outputRange: [0, 0, 1.02, 1] });
  const gX = progress.interpolate({ inputRange: [0, 0.12, 0.86, 1], outputRange: [26, 26, -0.5, 0] });
  const oX = progress.interpolate({ inputRange: [0, 0.12, 0.86, 1], outputRange: [-25, -25, 0.5, 0] });
  const lettersY = progress.interpolate({ inputRange: [0, 0.12, 0.86, 1], outputRange: [15, 15, -0.4, 0] });
  const mouthOpacity = progress.interpolate({ inputRange: [0, 0.43, 0.58, 1], outputRange: [0, 0, 1, 1] });
  const mouthY = progress.interpolate({ inputRange: [0, 0.48, 0.82, 1], outputRange: [8, 8, -0.5, 0] });
  const mintDotOpacity = progress.interpolate({ inputRange: [0, 0.42, 0.7, 1], outputRange: [1, 1, 0, 0] });
  const pinkDotOpacity = progress.interpolate({ inputRange: [0, 0.42, 0.7, 1], outputRange: [0, 0, 1, 1] });

  return (
    <View accessibilityLabel="GO 워드마크가 얼굴 로고로 조합되는 애니메이션" style={styles.canvas}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: gX }, { translateY: lettersY }] }]}><OfficialLetter letter="g" /></Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: oX }, { translateY: lettersY }] }]}><OfficialLetter letter="o" /></Animated.View>
      <Animated.View style={[styles.dot, styles.mintDot, { opacity: mintDotOpacity, transform: [{ translateX: Animated.multiply(spread, -55) }, { translateY: Animated.multiply(spread, -3) }, { scale: spread.interpolate({ inputRange: [0, 1], outputRange: [1, 1.95] }) }] }]} />
      <Animated.View style={[styles.dot, styles.pinkDot, { opacity: pinkDotOpacity, transform: [{ translateX: Animated.multiply(spread, -55) }, { translateY: Animated.multiply(spread, -3) }, { scale: spread.interpolate({ inputRange: [0, 1], outputRange: [1, 1.95] }) }] }]} />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: mouthOpacity, transform: [{ translateY: mouthY }] }]}><OfficialMouth /></Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, overflow: 'visible' },
  dot: { position: 'absolute', left: 166, top: 87, width: 8, height: 8, borderRadius: 4 },
  mintDot: { backgroundColor: '#6BBDA6' },
  pinkDot: { backgroundColor: '#FC9EA0' },
});
