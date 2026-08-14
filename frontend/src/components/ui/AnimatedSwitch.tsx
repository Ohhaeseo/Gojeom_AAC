import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { colors } from '@/theme/tokens';

type AnimatedSwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
  style?: ViewStyle;
};

export function AnimatedSwitch({ value, onValueChange, disabled = false, accessibilityLabel, style }: AnimatedSwitchProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [progress] = useState(() => new Animated.Value(value ? 1 : 0));

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: reduceMotion ? 0 : 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, reduceMotion, value]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [3, 19] });
  const backgroundColor = progress.interpolate({ inputRange: [0, 1], outputRange: ['#C4D0CC', colors.primary] });
  const shadowOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.22] });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onValueChange(!value)}
      style={[styles.hitArea, disabled && styles.disabled, style]}
    >
      <Animated.View style={[styles.track, { backgroundColor }]}>
        <Animated.View style={[styles.thumb, { shadowOpacity, transform: [{ translateX }] }]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitArea: { width: 52, height: 44, alignItems: 'center', justifyContent: 'center' },
  track: { width: 40, height: 24, borderRadius: 12, justifyContent: 'center' },
  thumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.white,
    shadowColor: '#121D2D',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  disabled: { opacity: 0.45 },
});
