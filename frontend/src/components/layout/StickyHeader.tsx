import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { VectorWordmark } from '@/components/brand/VectorWordmark';
import { colors, typography } from '@/theme/tokens';

export function StickyHeader({ title, showBack = true, showLogo = true }: { title?: string; showBack?: boolean; showLogo?: boolean }) {
  return (
    <View style={styles.root}>
      <View style={styles.left}>
        {showBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel="뒤로가기" hitSlop={8} onPress={() => router.back()} style={styles.back}>
            <Svg width={16} height={24} viewBox="0 0 16 24"><Path d="M13 2L3 12L13 22" fill="none" stroke={colors.text} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></Svg>
          </Pressable>
        ) : null}
        {showLogo ? <VectorWordmark width={82} height={37} /> : null}
      </View>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.balance} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { height: 72, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(243,250,248,0.96)' },
  left: { flexDirection: 'row', alignItems: 'center' },
  back: { width: 23, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  title: { ...typography.label, color: colors.text },
  balance: { width: 44 },
});
