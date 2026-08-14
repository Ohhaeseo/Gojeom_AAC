import type { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StickyHeader } from '@/components/layout/StickyHeader';
import { BottomNavigation } from '@/components/navigation/BottomNavigation';
import { colors, spacing } from '@/theme/tokens';

type AppScreenProps = PropsWithChildren<{
  header?: boolean;
  title?: string;
  back?: boolean;
  headerLogo?: boolean;
  navigation?: boolean;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  overlay?: ReactNode;
}>;

export function AppScreen({ children, header = true, title, back = true, headerLogo = true, navigation = false, scroll = true, contentStyle, overlay }: AppScreenProps) {
  const content = scroll ? (
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, navigation && styles.withNav, contentStyle]}>{children}</ScrollView>
  ) : <View style={[styles.content, styles.static, navigation && styles.withNav, contentStyle]}>{children}</View>;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {header ? <StickyHeader title={title} showBack={back} showLogo={headerLogo} /> : null}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>{content}</KeyboardAvoidingView>
      {navigation ? <BottomNavigation /> : null}
      {overlay}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.lg, gap: spacing.md },
  static: { flex: 1 },
  withNav: { paddingBottom: spacing.xl },
});
