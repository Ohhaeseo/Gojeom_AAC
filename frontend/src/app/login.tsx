import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { authErrorFields, checkEmail, checkPasswordPresent } from '@/lib/credentials';
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
  /** 서버가 지목한 입력칸별 사유. 해당 칸 밑에 붙는다. */
  const [fields, setFields] = useState<Record<string, string>>({});
  /** 한 번 눌러 보기 전에는 형식을 지적하지 않는다. (`signup.tsx`와 같은 규칙) */
  const [submitted, setSubmitted] = useState(false);

  const emailCheck = checkEmail(email);
  const passwordCheck = checkPasswordPresent(password);
  const emailError = fields.email ?? (submitted && !emailCheck.ok ? emailCheck.message : undefined);
  const passwordError = fields.password ?? (submitted && !passwordCheck.ok ? passwordCheck.message : undefined);

  /** 실패 사유를 붙일 곳이 있으면 그 칸 밑에, 없으면 위쪽 한 줄로. */
  const report = (result: { code?: string; message?: string; fields?: Record<string, string> }, fallback: string) => {
    const placed = authErrorFields(result);
    setFields(placed);
    setError(Object.keys(placed).length ? '' : (result.message ?? fallback));
  };

  const submitGoogle = async (idToken: string) => {
    setError(''); setFields({});
    setPending(true);
    const result = await loginWithGoogle(idToken);
    setPending(false);
    if (result.ok) { setError(''); return router.replace('/home'); }
    /*
      **Google은 가입과 로그인이 같은 엔드포인트다.** 처음 쓰는 계정이면 서버가
      계정을 만들어야 하는데, 그 전에 나이와 동의가 필요해 `CONSENT_REQUIRED`가
      돌아온다. 이것은 실패가 아니라 **가입이 필요하다는 뜻**이므로 빨간 오류를
      띄우는 대신 가입 화면으로 보낸다.

      **토큰은 주소창이 아니라 메모리로 넘긴다.** `AppState.googleSignup`이 들고 있다가
      가입 화면이 생년월일·동의를 받아 그대로 이어서 부른다 — 사용자는 Google 버튼을
      한 번만 누른다. (예전에는 여기서 토큰을 버려 가입 화면에서 다시 눌러야 했다)
    */
    if (result.code === 'CONSENT_REQUIRED') {
      return router.replace({ pathname: '/signup', params: { reason: 'google-new' } });
    }
    report(result, 'Google 로그인에 실패했어요.');
  };
  const submit = async () => {
    setSubmitted(true); setError(''); setFields({});
    // 비었거나 형식이 틀린 것은 왕복 없이 여기서 말해 준다.
    if (!emailCheck.ok || !passwordCheck.ok) return;

    setPending(true);
    // 서버는 "없는 계정"과 "비밀번호 틀림"을 구분해 주지 않는다. 계정 존재 여부를
    // 흘리지 않으려는 의도이므로, 서버가 준 문구를 그대로 보여준다.
    const result = await login(email, password);
    setPending(false);
    if (!result.ok) return report(result, '로그인에 실패했어요.');
    router.replace('/home');
  };
  return (
    <AppScreen title="로그인" headerLogo={false} navigation={false} contentStyle={styles.content}>
      <BrandLogo variant="face" style={styles.logo} />
      <View style={styles.form}>
        <FormField label="이메일" required value={email} onChangeText={(value) => { setEmail(value); setError(''); setFields({}); }} autoCapitalize="none" keyboardType="email-address" placeholder="이메일을 입력해 주세요." error={emailError} />
        <FormField label="비밀번호" required value={password} onChangeText={(value) => { setPassword(value); setError(''); setFields({}); }} secureTextEntry placeholder="비밀번호를 입력해 주세요." error={passwordError} />
      </View>
      {/* 어느 칸에도 붙지 않는 사유(네트워크·준비 중인 로그인 수단 등)만 여기 뜬다. */}
      {error ? <Text style={styles.formError}>{error}</Text> : null}
      <View style={styles.linkRow}><Text style={styles.muted}>아직 고점 회원이 아니신가요?</Text><Pressable onPress={() => router.replace('/signup')}><Text style={styles.link}>회원가입 하기</Text></Pressable></View>
      <AppButton label={pending ? '로그인 중...' : '로그인'} disabled={pending} onPress={submit} />
      <View style={styles.social}>
        <Pressable accessibilityRole="button" accessibilityLabel="네이버 로그인 준비 중" style={styles.socialButton} onPress={() => setError('네이버 로그인은 준비 중이에요.')}><Image source={naver} contentFit="contain" style={styles.socialIcon} /></Pressable>
        <GoogleSignInButton onToken={submitGoogle} onError={setError} />
        <Pressable accessibilityRole="button" accessibilityLabel="전화번호 로그인 준비 중" style={styles.socialButton} onPress={() => setError('전화번호 로그인은 준비 중이에요.')}><Image source={phone} contentFit="contain" style={styles.socialIcon} /></Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({ content: { paddingTop: 70 }, logo: { alignSelf: 'center', width: 155, height: 104 }, form: { gap: spacing.md, marginTop: 12 }, formError: { ...typography.caption, color: colors.danger, textAlign: 'center' }, linkRow: { alignItems: 'center', gap: 4 }, muted: { ...typography.body, color: colors.textMuted }, link: { ...typography.label, color: colors.primary }, social: { flexDirection: 'row', justifyContent: 'center', gap: 28, alignItems: 'center' }, socialButton: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }, socialIcon: { width: 38, height: 38 } });
