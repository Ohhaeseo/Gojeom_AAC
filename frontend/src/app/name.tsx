import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { BrandLogo } from '@/components/brand/BrandLogo';
import { CircleFaceLogo } from '@/components/brand/CircleFaceLogo';
import { AppScreen } from '@/components/layout/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';
import { useAppState } from '@/state/AppState';
import { colors, radius, spacing, typography } from '@/theme/tokens';

const comparison = require('../../assets/comparison-before-after-reference.png');

export default function NameScreen() {
  const { nickname, setNickname } = useAppState(); const [value, setValue] = useState(nickname === '새로운 회원' ? '' : nickname);
  return (
    <AppScreen header={false} contentStyle={styles.content}>
      <BrandLogo style={styles.wordmark} />
      <Text style={styles.title}>환영해요!</Text><Text style={styles.description}>나만의 고점으로 가는 여정, 우리 함께해요.</Text>
      <CircleFaceLogo size={150} />
      <Text style={styles.sectionTitle}>남들이 시도한 변화와 생활 습관</Text><Text style={styles.description}>나에게도 잘 맞을지 고점으로 확인할 수 있어요!</Text>
      <Image source={comparison} contentFit="cover" style={styles.comparison} />
      <Text style={styles.sectionTitle}>우선 회원님의 정보를 입력해주세요.</Text><Text style={styles.description}>회원님의 개성 넘치는 애칭을 알려주세요!</Text>
      <FormField value={value} onChangeText={(text) => setValue(text.slice(0, 10))} placeholder="이곳에 입력해주세요. (최대 10자)" />
      <Text style={styles.note}>*애칭은 메인화면에 표시 될 회원님의 이름이에요.</Text>
      <AppButton label="이름 정하기" disabled={!value.trim()} onPress={() => { setNickname(value.trim()); router.replace('/home'); }} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({ content: { paddingTop: 28 }, wordmark: { width: 82, height: 42 }, title: { ...typography.h1, color: colors.text, marginTop: 4 }, sectionTitle: { ...typography.title, color: colors.text, marginTop: spacing.sm }, description: { ...typography.body, color: colors.textTertiary }, comparison: { width: '100%', aspectRatio: 1.5, borderRadius: radius.md }, note: { ...typography.caption, color: colors.textMuted } });
