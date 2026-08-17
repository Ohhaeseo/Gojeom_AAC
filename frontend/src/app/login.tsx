import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { AppScreen } from '@/components/layout/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';
import { useAppState } from '@/state/AppState';
import { colors, spacing, typography } from '@/theme/tokens';

// Google은 자체 버튼을 쓴다. 아래 두 개만 아이콘으로 남는다. (GoogleSignInButton)
const naver = require('../../assets/figma/login-naver.svg');
const phone = require('../../assets/figma/login-phone.svg');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loginWithGoogle } = useAppState();
  const [pending, setPending] = useState(false);

  const submitGoogle = async (idToken: string) => {
    setPending(true);
    const result = await loginWithGoogle(idToken);
    setPending(false);
    if (!result.ok) return setError(result.message ?? 'Google 로그인에 실패했어요.');
    setError(''); router.replace('/home');
  };
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
      <View style={styles.social}>
        <Pressable accessibilityRole="button" accessibilityLabel="네이버 로그인 준비 중" style={styles.socialButton} onPress={() => setError('네이버 로그인은 준비 중이에요.')}><Image source={naver} contentFit="contain" style={styles.socialIcon} /></Pressable>
        <GoogleSignInButton onToken={submitGoogle} onError={setError} />
        <Pressable accessibilityRole="button" accessibilityLabel="전화번호 로그인 준비 중" style={styles.socialButton} onPress={() => setError('전화번호 로그인은 준비 중이에요.')}><Image source={phone} contentFit="contain" style={styles.socialIcon} /></Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({ content: { paddingTop: 70 }, logo: { alignSelf: 'center', width: 155, height: 104 }, form: { gap: spacing.md, marginTop: 12 }, linkRow: { alignItems: 'center', gap: 4 }, muted: { ...typography.body, color: colors.textMuted }, link: { ...typography.label, color: colors.primary }, social: { flexDirection: 'row', justifyContent: 'center', gap: 28, alignItems: 'center' }, socialButton: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }, socialIcon: { width: 38, height: 38 } });
