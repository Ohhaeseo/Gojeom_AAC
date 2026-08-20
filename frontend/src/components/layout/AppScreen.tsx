import type { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StickyHeader } from '@/components/layout/StickyHeader';
import { BottomNavigation } from '@/components/navigation/BottomNavigation';
import { colors, layout, spacing } from '@/theme/tokens';

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
      {/* 헤더·내용·하단 네비를 함께 묶어야 셋의 폭이 어긋나지 않는다. */}
      <View style={styles.shell}>
        {header ? <StickyHeader title={title} showBack={back} showLogo={headerLogo} /> : null}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>{content}</KeyboardAvoidingView>
        {navigation ? <BottomNavigation /> : null}
      </View>
      {/* 오버레이는 껍데기 밖에 둔다. 모달·로딩은 화면 전체를 덮어야 한다. */}
      {overlay}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  // 좁은 화면(실기기)에서는 width: '100%'가 이겨서 시안 폭 그대로 돈다.
  // 넓은 화면(데스크톱 브라우저)에서만 maxWidth가 걸리고 가운데로 모인다.
  shell: { flex: 1, width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center' },
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.lg, gap: spacing.md },
  static: { flex: 1 },
  withNav: { paddingBottom: spacing.xl },
});
