import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { CheckRow } from '@/components/ui/CheckRow';
import {
  CONSENT_CODES, CONSENT_DETAIL, CONSENT_LABEL, REQUIRED_CONSENTS,
  checkBirth, formatBirthInput, toIsoBirthDate, type ConsentCode,
} from '@/lib/consent';
import { AppScreen } from '@/components/layout/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';
import { useAppState } from '@/state/AppState';
import { colors, radius, typography } from '@/theme/tokens';

// Google은 자체 버튼을 쓴다. 아래 두 개만 아이콘으로 남는다. (GoogleSignInButton)
const naver = require('../../assets/figma/login-naver.svg');
const phone = require('../../assets/figma/login-phone.svg');

export default function SignupScreen() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(''); const { register, loginWithGoogle } = useAppState();
  const [pending, setPending] = useState(false);

  // 숫자 8자리로만 들고 있다가 보낼 때 YYYY-MM-DD로 바꾼다. 화면에는 점을 찍어 보여준다.
  const [birth, setBirth] = useState('');
  const [agreed, setAgreed] = useState<ConsentCode[]>([]);

  const birthCheck = checkBirth(birth);
  const requiredOk = REQUIRED_CONSENTS.every((code) => agreed.includes(code));
  const allChecked = CONSENT_CODES.every((code) => agreed.includes(code));

  const toggle = (code: ConsentCode) => {
    setError('');
    setAgreed((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]));
  };
  const toggleAll = () => {
    setError('');
    setAgreed(allChecked ? [] : [...CONSENT_CODES]);
  };

  // Google은 가입과 로그인이 같은 엔드포인트다. 처음이면 서버가 계정을 만드는데,
  // **그때도 나이와 동의가 필요하다.** 가입 화면에서는 이미 받았으니 함께 보낸다.
  const submitGoogle = async (idToken: string) => {
    setPending(true);
    const result = await loginWithGoogle(idToken, toIsoBirthDate(birth), agreed);
    setPending(false);
    if (!result.ok) return setError(result.message ?? 'Google 로그인에 실패했어요.');
    setError(''); router.replace('/home');
  };

  const valid = Boolean(email && password && password === confirm && birthCheck.ok && requiredOk);
  const submit = async () => {
    setPending(true);
    const result = await register(email, password, toIsoBirthDate(birth), agreed);
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
        <FormField
          label="생년월일"
          required
          value={formatBirthInput(birth)}
          onChangeText={(value) => { setBirth(value.replace(/\D/g, '').slice(0, 8)); setError(''); }}
          keyboardType="number-pad"
          placeholder="YYYYMMDD (예: 20000131)"
          error={birthCheck.message}
        />
      </View>

      {/*
        필수와 선택을 나눠서 받는다. 묶어서 받으면 선택 항목이 사실상 필수가 되어
        개인정보보호법이 금지하는 형태가 된다. 특히 얼굴 사진과 건강 정보는
        민감정보라 일반 개인정보 동의에 섞을 수 없다.
      */}
      <View style={styles.consents}>
        <CheckRow label="약관 전체 동의" checked={allChecked} onToggle={toggleAll} emphasis />
        <View style={styles.divider} />
        {CONSENT_CODES.map((code) => (
          <CheckRow
            key={code}
            label={CONSENT_LABEL[code]}
            detail={CONSENT_DETAIL[code]}
            required={REQUIRED_CONSENTS.includes(code)}
            checked={agreed.includes(code)}
            onToggle={() => toggle(code)}
          />
        ))}
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

const styles = StyleSheet.create({ content: { paddingTop: 40 }, logo: { alignSelf: 'center', width: 145, height: 98 }, form: { gap: 12 }, consents: { padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface }, divider: { height: 1, marginVertical: 6, backgroundColor: colors.divider }, linkRow: { alignItems: 'center', gap: 4 }, muted: { ...typography.body, color: colors.textMuted }, link: { ...typography.label, color: colors.primary }, social: { flexDirection: 'row', justifyContent: 'center', gap: 28, alignItems: 'center' }, socialButton: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }, socialIcon: { width: 38, height: 38 }, privacy: { ...typography.caption, color: colors.textMuted, textAlign: 'center' } });
