import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View } from 'react-native';

/**
 * 뒤를 가리는 흐림막.
 *
 * 🔴 **안드로이드의 `expo-blur`는 기본적으로 흐리지 않는다.** 패키지 타입에
 * `experimentalBlurMethod` 의 `@default 'none'` `@platform android` 라고 적혀 있다 —
 * 켜지 않으면 `BlurView`가 **투명한 View 하나**로 끝난다. iOS·웹에서는 멀쩡히
 * 흐려지므로 **개발 중에는 드러나지 않고 APK 에서만 드러난다.** 실제로 그랬다.
 *
 * <p>그래서 두 겹으로 만든다.
 *
 * 1. 안드로이드 흐림을 **켠다** (`dimezisBlurView`)
 * 2. 🔴 그래도 **흐림에만 기대지 않는다** — 반투명 가림막을 항상 함께 깐다
 *
 * <p>2번이 핵심이다. 이 막의 일은 "예쁘게 흐리기"가 아니라 **프로필 등록 전에는
 * 내용을 못 읽게 하는 것**이다. 흐림이 조용히 실패하면 잠금 자체가 사라지는데,
 * 그것이 지금 홈에서 일어난 일이다. 흐림은 있으면 좋은 것이고, 가림막이 약속이다.
 *
 * <p>안드로이드 가림막을 더 두껍게 두는 이유도 같다. 그쪽 흐림은 실험 기능이라
 * 기기·버전에 따라 안 먹을 수 있고, **안 먹었을 때도 가려져 있어야 한다.**
 */
export function Frost({ intensity = 18, veil }: { intensity?: number; veil?: number }) {
  // 흐림이 보장되는 쪽은 얇게, 보장되지 않는 쪽은 두껍게.
  const opacity = veil ?? Platform.select({ android: 0.72, default: 0.25 }) ?? 0.25;

  return (
    <>
      <BlurView
        intensity={intensity}
        tint="light"
        // 안드로이드 전용 값이다. 다른 플랫폼은 그냥 무시한다.
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      {/* 버튼을 가로막지 않는다 — 이 막 위에 안내 카드와 버튼이 올라온다. */}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(255, 255, 255, ${opacity})` }]}
      />
    </>
  );
}
