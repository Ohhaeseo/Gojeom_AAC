import { useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/theme/tokens';

type Props<T> = {
  data: T[];
  keyOf: (item: T) => string;
  /**
   * `dragging`이면 들어올린 모양으로 그린다. `controls`는 순서 조작 UI다 —
   * 끌기 손잡이와 위·아래 버튼이 함께 들어 있다.
   */
  renderItem: (item: T, dragging: boolean, controls: ReactNode) => ReactNode;
  /** 놓았을 때 새 순서. 순서가 그대로면 부르지 않는다. */
  onReorder: (next: T[]) => void;
  /** 항목 사이 간격. 자리 계산에 쓴다. */
  gap?: number;
};

/**
 * 끌어서 순서를 바꾸는 목록.
 *
 * <p><b>직접 만든 이유</b> — `react-native-draggable-flatlist`는 셀 위치를
 * `findNodeHandle`로 재는데 RN Web에 그 API가 없다. 웹에서 콘솔에
 * "findNodeHandle is not supported on web"만 남기고 <b>아무 반응도 하지 않는다.</b>
 * `PanResponder`는 react-native 코어이고 웹에서는 마우스·터치 이벤트로 내려가므로
 * 한 벌로 웹과 앱을 모두 덮는다.
 *
 * <p><b>손잡이로만 끈다.</b> 카드 아무 데나 길게 눌러 시작하게 하면 카드 자체의
 * 탭·스크롤과 다투게 된다. 손잡이를 따로 두면 의도가 분명하고 구현도 단순하다.
 *
 * <p>항목 높이가 <b>모두 같다고 본다.</b> 첫 항목을 재서 보폭으로 쓴다. 이 목록이
 * 쓰이는 곳(목표 카드)은 내용 길이와 무관하게 높이가 같다.
 */
export function DragList<T>({ data, keyOf, renderItem, onReorder, gap = 12 }: Props<T>) {
  const [height, setHeight] = useState(0);
  const [from, setFrom] = useState<number | null>(null);
  const [to, setTo] = useState<number | null>(null);
  const shift = useRef(new Animated.Value(0)).current;

  const stride = height + gap;

  // PanResponder 안에서는 state가 생성 시점 값으로 굳는다. 최신 값을 ref로 읽는다.
  const live = useRef({ data, stride, from: null as number | null, to: null as number | null });
  live.current.data = data;
  live.current.stride = stride;

  const responderFor = (index: number) => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      live.current.from = index; live.current.to = index;
      setFrom(index); setTo(index);
      shift.setValue(0);
    },
    onPanResponderMove: (_event, gesture) => {
      shift.setValue(gesture.dy);
      const step = live.current.stride;
      if (!step) return;
      const start = live.current.from ?? index;
      const next = Math.min(
        live.current.data.length - 1,
        Math.max(0, start + Math.round(gesture.dy / step)),
      );
      if (next !== live.current.to) { live.current.to = next; setTo(next); }
    },
    onPanResponderRelease: () => {
      const start = live.current.from;
      const end = live.current.to;
      if (start != null && end != null && start !== end) {
        const next = [...live.current.data];
        const [moved] = next.splice(start, 1);
        next.splice(end, 0, moved!);
        onReorder(next);
      }
      live.current.from = null; live.current.to = null;
      setFrom(null); setTo(null);
      shift.setValue(0);
    },
    onPanResponderTerminate: () => {
      live.current.from = null; live.current.to = null;
      setFrom(null); setTo(null);
      shift.setValue(0);
    },
  });

  /**
   * 끌지 않는 항목이 비켜주는 거리.
   *
   * 끄는 항목이 아래로 가면 그 사이 항목들이 한 칸 위로, 위로 가면 한 칸 아래로
   * 밀린다. 이게 없으면 빈자리가 보이지 않아 어디에 놓이는지 알 수 없다.
   */
  const displacement = (index: number): number => {
    if (from == null || to == null || index === from) return 0;
    if (from < to && index > from && index <= to) return -stride;
    if (from > to && index < from && index >= to) return stride;
    return 0;
  };

  return (
    <View style={{ gap }}>
      {data.map((item, index) => {
        const dragging = index === from;
        const step = (delta: number) => {
          const target = index + delta;
          if (target < 0 || target >= data.length) return;
          const next = [...data];
          const [moved] = next.splice(index, 1);
          next.splice(target, 0, moved!);
          onReorder(next);
        };
        /*
          끌기와 버튼을 **둘 다** 준다.

          끌기는 손에 익은 방식이지만 RN Web에서는 브라우저·입력기기에 따라
          잡히지 않는 경우가 있다. 버튼은 어디서나 확실히 동작하고 키보드로도
          쓸 수 있어, 순서를 바꾸는 길이 최소 하나는 늘 열려 있게 된다.
        */
        const controls = (
          <View style={styles.controls}>
            <Pressable accessibilityRole="button" accessibilityLabel="위로 옮기기" disabled={index === 0} onPress={() => step(-1)} hitSlop={4} style={styles.stepBtn}>
              <Text style={[styles.stepIcon, index === 0 && styles.stepOff]}>▲</Text>
            </Pressable>
            <View {...responderFor(index).panHandlers} accessibilityRole="adjustable" accessibilityLabel="끌어서 순서 바꾸기" style={styles.handle}>
              <Text style={styles.handleIcon}>⋮⋮</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="아래로 옮기기" disabled={index === data.length - 1} onPress={() => step(1)} hitSlop={4} style={styles.stepBtn}>
              <Text style={[styles.stepIcon, index === data.length - 1 && styles.stepOff]}>▼</Text>
            </Pressable>
          </View>
        );
        return (
          <Animated.View
            key={keyOf(item)}
            onLayout={index === 0 ? (event) => setHeight(event.nativeEvent.layout.height) : undefined}
            style={[
              dragging ? styles.lifted : null,
              { transform: [{ translateY: dragging ? shift : new Animated.Value(displacement(index)) }] },
            ]}
          >
            {renderItem(item, dragging, controls)}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // 끄는 동안 다른 카드 위로 올라와야 어디에 있는지 보인다.
  lifted: { zIndex: 10, elevation: 10, opacity: 0.96, shadowColor: colors.text, shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  controls: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  stepIcon: { fontSize: 11, color: colors.textMuted },
  stepOff: { color: colors.disabled, opacity: 0.5 },
  handle: { paddingHorizontal: 6, paddingVertical: 6 },
  handleIcon: { ...typography.label, color: colors.disabled, letterSpacing: -2 },
});
