import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brand/BrandLogo';
import { AppScreen } from '@/components/layout/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';
import { useAppState } from '@/state/AppState';
import { colors, spacing, typography } from '@/theme/tokens';

const social = [require('../../assets/figma/login-naver.svg'), require('../../assets/figma/login-google.png'), require('../../assets/figma/login-phone.svg')];

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAppState();
  const [pending, setPending] = useState(false);
  const submit = async () => {
    setPending(true);
    // 서버는 "없는 계정"과 "비밀번호 틀림"을 구분해 주지 않는다. 계정 존재 여부를
    // 흘리지 않으려는 의도이므로, 서버가 준 문구를 그대로 보여준다.
    const result = await login(email, password);
    setPending(false);
    if (!result.ok) return setError(result.message ?? '로그인에 실패했어요.');
    setError(''); router.replace('/home');
  };
  return (
    <AppScreen title="로그인" headerLogo={false} navigation={false} contentStyle={styles.content}>
      <BrandLogo variant="face" style={styles.logo} />
      <View style={styles.form}>
        <FormField label="아이디" required value={email} onChangeText={(value) => { setEmail(value); setError(''); }} autoCapitalize="none" placeholder="아이디혹은 전화번호를 입력해 주세요." />
        <FormField label="비밀번호" required value={password} onChangeText={(value) => { setPassword(value); setError(''); }} secureTextEntry placeholder="비밀번호를 입력해 주세요." error={error || undefined} />
      </View>
      <View style={styles.linkRow}><Text style={styles.muted}>아직 고점 회원이 아니신가요?</Text><Pressable onPress={() => router.replace('/signup')}><Text style={styles.link}>회원가입 하기</Text></Pressable></View>
      <AppButton label={pending ? '로그인 중...' : '로그인'} disabled={!email || !password || pending} onPress={submit} />
      <View style={styles.social}>{social.map((source, index) => <Pressable key={index} accessibilityRole="button" accessibilityLabel="소셜 로그인 준비 중" style={styles.socialButton}><Image source={source} contentFit="contain" style={styles.socialIcon} /></Pressable>)}</View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({ content: { paddingTop: 70 }, logo: { alignSelf: 'center', width: 155, height: 104 }, form: { gap: spacing.md, marginTop: 12 }, linkRow: { alignItems: 'center', gap: 4 }, muted: { ...typography.body, color: colors.textMuted }, link: { ...typography.label, color: colors.primary }, social: { flexDirection: 'row', justifyContent: 'center', gap: 28 }, socialButton: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }, socialIcon: { width: 38, height: 38 } });
