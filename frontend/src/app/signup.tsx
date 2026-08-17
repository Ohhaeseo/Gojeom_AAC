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
import { colors, typography } from '@/theme/tokens';

// Google은 자체 버튼을 쓴다. 아래 두 개만 아이콘으로 남는다. (GoogleSignInButton)
const naver = require('../../assets/figma/login-naver.svg');
const phone = require('../../assets/figma/login-phone.svg');

export default function SignupScreen() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(''); const { register, loginWithGoogle } = useAppState();
  const [pending, setPending] = useState(false);

  // Google은 가입과 로그인이 같은 엔드포인트다. 처음이면 서버가 계정을 만든다.
  // 닉네임도 Google이 준 이름으로 채워지므로 `/name`을 거치지 않는다.
  const submitGoogle = async (idToken: string) => {
    setPending(true);
    const result = await loginWithGoogle(idToken);
    setPending(false);
    if (!result.ok) return setError(result.message ?? 'Google 로그인에 실패했어요.');
    setError(''); router.replace('/home');
  };
  const valid = Boolean(email && password && password === confirm);
  const submit = async () => {
    setPending(true);
    const result = await register(email, password);
    setPending(false);
    if (!result.ok) return setError(result.message ?? '회원가입에 실패했어요.');
    setError(''); router.replace('/name');
  };
  return (
    <AppScreen title="회원가입" headerLogo={false} contentStyle={styles.content}>
      <BrandLogo variant="face" style={styles.logo} />
      <View style={styles.form}>
        <FormField label="아이디" required value={email} onChangeText={(value) => { setEmail(value); setError(''); }} autoCapitalize="none" placeholder="아이디혹은 전화번호를 입력해 주세요." error={error || undefined} />
        <FormField label="비밀번호" required value={password} onChangeText={setPassword} secureTextEntry placeholder="비밀번호를 입력해 주세요." />
        <FormField label="비밀번호 확인" required value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="비밀번호를 다시 입력해 주세요." error={confirm && password !== confirm ? '비밀번호가 일치하지 않아요.' : undefined} />
      </View>
      <View style={styles.linkRow}><Text style={styles.muted}>이미 고점 회원이신가요?</Text><Pressable onPress={() => router.replace('/login')}><Text style={styles.link}>로그인 하기</Text></Pressable></View>
      <AppButton label={pending ? '가입 중...' : '회원가입 하기'} disabled={!valid || pending} onPress={submit} />
      <View style={styles.social}>
        <Pressable accessibilityRole="button" accessibilityLabel="네이버 가입 준비 중" style={styles.socialButton} onPress={() => setError('네이버 가입은 준비 중이에요.')}><Image source={naver} contentFit="contain" style={styles.socialIcon} /></Pressable>
        <GoogleSignInButton onToken={submitGoogle} onError={setError} />
        <Pressable accessibilityRole="button" accessibilityLabel="전화번호 가입 준비 중" style={styles.socialButton} onPress={() => setError('전화번호 가입은 준비 중이에요.')}><Image source={phone} contentFit="contain" style={styles.socialIcon} /></Pressable>
      </View>
      <Text style={styles.privacy}>GO.는 민감한 건강정보를 최소한으로 수집하고{`\n`}사용자 동의에 따라 철저하게 관리합니다.</Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({ content: { paddingTop: 40 }, logo: { alignSelf: 'center', width: 145, height: 98 }, form: { gap: 12 }, linkRow: { alignItems: 'center', gap: 4 }, muted: { ...typography.body, color: colors.textMuted }, link: { ...typography.label, color: colors.primary }, social: { flexDirection: 'row', justifyContent: 'center', gap: 28, alignItems: 'center' }, socialButton: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }, socialIcon: { width: 38, height: 38 }, privacy: { ...typography.caption, color: colors.textMuted, textAlign: 'center' } });
