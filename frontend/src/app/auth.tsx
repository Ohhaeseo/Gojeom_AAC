import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brand/BrandLogo';
import { AppScreen } from '@/components/layout/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { colors, spacing, typography } from '@/theme/tokens';

export default function AuthScreen() {
  return (
    <AppScreen header={false} scroll={false} contentStyle={styles.content}>
      <View style={styles.hero}>
        <BrandLogo variant="face" style={styles.logo} />
        <Text style={styles.title}>나의 고점으로 가는 여정,{`\n`}지금 시작해요.</Text>
        <Text style={styles.description}>내 마음 속 이미지를 목표로 설정하고, 나를 이해해보세요.</Text>
      </View>
      <View style={styles.actions}>
        <AppButton label="기존 회원 로그인" variant="dark" onPress={() => router.push('/login')} />
        <AppButton label="처음 시작 회원가입" onPress={() => router.push('/signup')} />
      </View>
      <Text style={styles.privacy}>GO.는 민감한 건강정보를 최소한으로 수집하고{`\n`}사용자 동의에 따라 철저하게 관리합니다.</Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'space-between', paddingTop: 110, paddingBottom: 70 },
  hero: { gap: spacing.md }, logo: { alignSelf: 'flex-start', width: 126, height: 86 },
  title: { ...typography.display, color: colors.text }, description: { ...typography.body, color: colors.textMuted },
  actions: { gap: 12 }, privacy: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
