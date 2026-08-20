import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { radius, shadow } from '@/theme/tokens';

/**
 * 분석 화면의 큰 패널.
 *
 * <b>내용이 넘치면 잘리는 대신 스크롤된다.</b> 예전에는 `overflow: hidden`인 채
 * 고정 높이 내용을 담고 있어, 남은 높이가 모자라면 <b>로고 위쪽과 버튼 아래쪽이
 * 통째로 잘려 나갔다.</b> 작은 화면 + 글꼴 '아주 크게'가 그 조합이다.
 */
export function AnalysisPanel({ children }: PropsWithChildren) {
  return (
    <View style={styles.panel}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{children}</ScrollView>
    </View>
  );
}

// `panel`에 `minHeight`를 두지 않는다. 이 패널을 쓰는 두 화면이 모두
// `scroll={false}`라, 남은 높이보다 큰 최소 높이를 주면 화면 자체가 넘친다.
// `flex: 1`이 사용 가능한 높이를 정확히 채운다.
//
// 가운데 정렬은 `content`의 `flexGrow: 1` + `justifyContent`가 맡는다 — 들어갈
// 때는 지금까지와 똑같이 가운데에 놓이고, 넘칠 때만 스크롤이 생긴다.
const styles = StyleSheet.create({
  panel: { flex: 1, overflow: 'hidden', borderRadius: radius.lg, backgroundColor: '#E4ECEA', ...shadow },
  scroll: { flex: 1, alignSelf: 'stretch' },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
});
