import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { colors, radius, typography } from '@/theme/tokens';

type Props = {
  /**
   * 0~100. **서버가 준 값만 넣는다.**
   *
   * 없으면(`undefined`) 숫자를 지어내지 않고 흐르는 막대만 보여준다. 예전에는
   * `86%`가 두 화면에 하드코딩돼 있었는데, 늘 86%에 멈춰 있는 게이지는 아무것도
   * 알려주지 않으면서 알려주는 척한다. (AGENTS.md 규칙 6)
   */
  percent?: number;
  label?: string;
};

/** 진행 표시를 한 곳으로 모은다. 화면마다 다르게 그리면 같은 단계도 달라 보인다. */
export function ProgressGauge({ percent, label }: Props) {
  const known = typeof percent === 'number' && Number.isFinite(percent);
  const clamped = known ? Math.max(0, Math.min(100, Math.round(percent))) : 0;

  const flow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (known) return;
    // 값을 모를 때만 흐르게 둔다. 아는 값을 흐르는 막대로 덮으면 정보가 사라진다.
    const loop = Animated.loop(Animated.timing(flow, {
      toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true,
    }));
    loop.start();
    return () => loop.stop();
  }, [flow, known]);

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <Text style={styles.label}>{label ?? '분석 중'}</Text>
        {known ? <Text style={styles.percent}>{clamped}%</Text> : null}
      </View>
      <View style={styles.track}>
        {known ? (
          <View style={[styles.fill, { width: `${clamped}%` }]} />
        ) : (
          <Animated.View
            style={[styles.fill, styles.flowing, {
              transform: [{ translateX: flow.interpolate({ inputRange: [0, 1], outputRange: ['-100%', '260%'] }) }],
            }]}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  label: { ...typography.caption, color: colors.textMuted },
  percent: { ...typography.label, color: colors.primaryPressed, fontVariant: ['tabular-nums'] },
  track: { height: 8, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: colors.disabled },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.primary },
  flowing: { width: '40%' },
});
