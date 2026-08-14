import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, shadow } from '@/theme/tokens';

export function AnalysisPanel({ children }: PropsWithChildren) {
  return <View style={styles.panel}>{children}</View>;
}

const styles = StyleSheet.create({ panel: { flex: 1, minHeight: 650, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: radius.lg, backgroundColor: '#E4ECEA', ...shadow } });
