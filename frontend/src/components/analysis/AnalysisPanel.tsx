import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, shadow } from '@/theme/tokens';

export function AnalysisPanel({ children }: PropsWithChildren) {
  return <View style={styles.panel}>{children}</View>;
}

// `minHeight`를 두지 않는다. 이 패널을 쓰는 두 화면이 모두 `scroll={false}`라
// 남은 높이보다 큰 최소 높이를 주면 **스크롤되지 않고 아래가 잘린다.**
// `flex: 1`이 사용 가능한 높이를 정확히 채운다.
const styles = StyleSheet.create({ panel: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: radius.lg, backgroundColor: '#E4ECEA', ...shadow } });
