import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { CheckRow } from '@/components/ui/CheckRow';
import {
  CONSENT_CODES, CONSENT_DETAIL, CONSENT_LABEL, REQUIRED_CONSENTS,
  checkBirth, formatBirthInput, toIsoBirthDate, type ConsentCode,
} from '@/lib/consent';
import { authErrorFields, checkEmail, checkPassword } from '@/lib/credentials';
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
  const [error, setError] = useState('');
  const { register, loginWithGoogle, googleSignup, clearGoogleSignup } = useAppState();
  /*
    🔴 **Google로 가입하는 중.** 로그인 화면에서 누른 토큰을 `AppState`가 들고 있다.
    이때는 이메일·비밀번호를 받지 않는다 — Google이 신원을 보증하므로 필요 없고,
    받으면 사용자가 만들지도 않을 비밀번호를 짜내게 된다.
  */
  const googleMode = Boolean(googleSignup);
  const [pending, setPending] = useState(false);
  /** 서버가 지목한 입력칸별 사유. 해당 칸 밑에 붙는다. */
  const [fields, setFields] = useState<Record<string, string>>({});
  /*
    한 번 눌러 보기 전에는 형식을 지적하지 않는다. 세 글자 쳤을 때 "8자 이상"이
    뜨면 안내가 아니라 잔소리로 읽힌다. 누른 뒤부터는 고칠 때마다 바로 갱신된다.
  */
  const [submitted, setSubmitted] = useState(false);

  // 숫자 8자리로만 들고 있다가 보낼 때 YYYY-MM-DD로 바꾼다. 화면에는 점을 찍어 보여준다.
  const [birth, setBirth] = useState('');
  const [agreed, setAgreed] = useState<ConsentCode[]>([]);

  /*
    로그인 화면에서 처음 쓰는 Google 계정으로 눌렀을 때 여기로 온다.
    **왜 회원가입 화면에 와 있는지 말해 주지 않으면 튕긴 것처럼 보인다.**
    (`login.tsx` · 서버가 `CONSENT_REQUIRED`를 돌려준 경우)
  */
  const { reason } = useLocalSearchParams<{ reason?: string }>();

  const birthCheck = checkBirth(birth);
  const emailCheck = checkEmail(email);
  const passwordCheck = checkPassword(password);
  const confirmOk = password === confirm;
  const requiredOk = REQUIRED_CONSENTS.every((code) => agreed.includes(code));

  // 서버가 지목한 사유가 우선이다 — 형식은 통과했는데 서버가 막은 경우다
  // ("이미 가입된 이메일이에요.").
  const show = (check: { ok: boolean; message?: string }) => (submitted && !check.ok ? check.message : undefined);
  const emailError = fields.email ?? show(emailCheck);
  const passwordError = fields.password ?? show(passwordCheck);
  const confirmError = (confirm || submitted) && !confirmOk ? '비밀번호가 일치하지 않아요.' : undefined;
  const birthError = fields.birthDate ?? birthCheck.message ?? (submitted && !birth ? '생년월일을 입력해주세요.' : undefined);
  const consentError = fields.consent ?? (submitted && !requiredOk ? '필수 약관에 모두 동의해주세요.' : undefined);
  const allChecked = CONSENT_CODES.every((code) => agreed.includes(code));

  const toggle = (code: ConsentCode) => {
    setError(''); setFields({});
    setAgreed((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]));
  };
  const toggleAll = () => {
    setError(''); setFields({});
    setAgreed(allChecked ? [] : [...CONSENT_CODES]);
  };

  // Google은 가입과 로그인이 같은 엔드포인트다. 처음이면 서버가 계정을 만드는데,
  // **그때도 나이와 동의가 필요하다.** 가입 화면에서는 이미 받았으니 함께 보낸다.
  /** 실패 사유를 붙일 곳이 있으면 그 칸 밑에, 없으면 위쪽 한 줄로. */
  const report = (result: { code?: string; message?: string; fields?: Record<string, string> }, fallback: string) => {
    const placed = authErrorFields(result);
    setFields(placed);
    setError(Object.keys(placed).length ? '' : (result.message ?? fallback));
  };

  const submitGoogle = async (idToken: string) => {
    setSubmitted(true); setError(''); setFields({});
    // Google도 신규 계정이면 나이·동의가 필요하다. 없이 보내면 서버가 막는데,
    // **무엇이 빠졌는지는 여기서 이미 안다.** 왕복하지 않고 바로 말해 준다.
    const birthDate = toIsoBirthDate(birth);
    if (!birthDate || !birthCheck.ok || !requiredOk) return;

    setPending(true);
    const result = await loginWithGoogle(idToken, birthDate, agreed);
    setPending(false);
    if (!result.ok) return report(result, 'Google 로그인에 실패했어요.');
    router.replace('/home');
  };

  /*
    🔴 **형식이 틀렸다고 버튼을 잠그지 않는다.** 잠가 두면 사용자는 왜 안 눌리는지
    모른 채 화면을 노려보게 된다 — 안 되는 이유를 말하는 것이 이 화면의 일이다.
    눌렀을 때 어디가 왜 틀렸는지 칸마다 붙여 주고, 서버까지 가지는 않는다.
  */
  const submit = async () => {
    setSubmitted(true); setError(''); setFields({});
    const birthDate = toIsoBirthDate(birth);
    if (!birthDate || !birthCheck.ok || !requiredOk) return;
    if (!googleMode && (!emailCheck.ok || !passwordCheck.ok || !confirmOk)) return;

    setPending(true);
    /*
      Google로 왔으면 들고 있던 토큰으로 그대로 끝낸다. **버튼을 다시 누르지 않는다.**
      닉네임은 Google 프로필에서 오므로 이름 화면도 건너뛴다.
    */
    const result = googleSignup
      ? await loginWithGoogle(googleSignup.idToken, birthDate, agreed)
      : await register(email, password, birthDate, agreed);
    setPending(false);
    if (!result.ok) return report(result, googleMode ? 'Google 가입에 실패했어요.' : '회원가입에 실패했어요.');
    router.replace(googleMode ? '/home' : '/name');
  };
  return (
    <AppScreen title="회원가입" headerLogo={false} contentStyle={styles.content}>
      <BrandLogo variant="face" style={styles.logo} />
      {googleMode ? (
        <View style={styles.googleCard}>
          <Text style={styles.googleTitle}>Google 계정으로 가입</Text>
          <Text style={styles.googleEmail}>{googleSignup?.email ?? '확인된 Google 계정'}</Text>
          <Text style={styles.googleHint}>생년월일과 약관 동의만 마치면 가입이 끝나요.</Text>
          <Text
            accessibilityRole="button"
            accessibilityLabel="다른 방법으로 가입하기"
            onPress={() => { clearGoogleSignup(); setError(''); setFields({}); }}
            style={styles.googleSwitch}
          >다른 방법으로 가입하기</Text>
        </View>
      ) : reason === 'google-new' ? (
        <Text style={styles.notice}>처음 오신 Google 계정이에요. 생년월일과 동의를 받아 가입을 마쳐주세요.</Text>
      ) : null}
      <View style={styles.form}>
        {/* Google이 신원을 보증하므로 이메일·비밀번호를 받지 않는다. */}
        {googleMode ? null : <>
        <FormField label="이메일" required value={email} onChangeText={(value) => { setEmail(value); setError(''); }} autoCapitalize="none" keyboardType="email-address" placeholder="이메일을 입력해 주세요." error={emailError} />
        <FormField label="비밀번호" required value={password} onChangeText={(value) => { setPassword(value); setFields({}); }} secureTextEntry placeholder="비밀번호를 입력해 주세요." error={passwordError} />
        <FormField label="비밀번호 확인" required value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="비밀번호를 다시 입력해 주세요." error={confirmError} />
        </>}
        <FormField
          label="생년월일"
          required
          value={formatBirthInput(birth)}
          onChangeText={(value) => { setBirth(value.replace(/\D/g, '').slice(0, 8)); setError(''); }}
          keyboardType="number-pad"
          placeholder="YYYYMMDD (예: 20000131)"
          error={birthError}
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
        {consentError ? <Text style={styles.fieldError}>{consentError}</Text> : null}
      </View>
      {/* 어느 칸에도 붙지 않는 사유(네트워크·서버 오류 등)만 여기 뜬다. */}
      {error ? <Text style={styles.formError}>{error}</Text> : null}
      <View style={styles.linkRow}><Text style={styles.muted}>이미 고점 회원이신가요?</Text><Pressable onPress={() => router.replace('/login')}><Text style={styles.link}>로그인 하기</Text></Pressable></View>
      <AppButton label={pending ? '가입 중...' : googleMode ? '가입 완료' : '회원가입 하기'} disabled={pending} onPress={submit} />
      {googleMode ? null : <View style={styles.social}>
        <Pressable accessibilityRole="button" accessibilityLabel="네이버 가입 준비 중" style={styles.socialButton} onPress={() => setError('네이버 가입은 준비 중이에요.')}><Image source={naver} contentFit="contain" style={styles.socialIcon} /></Pressable>
        <GoogleSignInButton onToken={submitGoogle} onError={setError} />
        <Pressable accessibilityRole="button" accessibilityLabel="전화번호 가입 준비 중" style={styles.socialButton} onPress={() => setError('전화번호 가입은 준비 중이에요.')}><Image source={phone} contentFit="contain" style={styles.socialIcon} /></Pressable>
      </View>}
      <Text style={styles.privacy}>GO.는 민감한 건강정보를 최소한으로 수집하고{`\n`}사용자 동의에 따라 철저하게 관리합니다.</Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({ content: { paddingTop: 40 }, notice: { ...typography.body, color: colors.primary, textAlign: 'center' }, logo: { alignSelf: 'center', width: 145, height: 98 }, form: { gap: 12 }, consents: { padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface }, divider: { height: 1, marginVertical: 6, backgroundColor: colors.divider }, googleCard: { gap: 4, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primaryLight, backgroundColor: colors.primaryBg }, googleTitle: { ...typography.label, color: colors.text }, googleEmail: { ...typography.body, color: colors.primaryPressed }, googleHint: { ...typography.caption, color: colors.textTertiary }, googleSwitch: { marginTop: 6, ...typography.caption, color: colors.textMuted, textDecorationLine: 'underline' }, fieldError: { marginTop: 8, ...typography.caption, color: colors.danger }, formError: { ...typography.caption, color: colors.danger, textAlign: 'center' }, linkRow: { alignItems: 'center', gap: 4 }, muted: { ...typography.body, color: colors.textMuted }, link: { ...typography.label, color: colors.primary }, social: { flexDirection: 'row', justifyContent: 'center', gap: 28, alignItems: 'center' }, socialButton: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }, socialIcon: { width: 38, height: 38 }, privacy: { ...typography.caption, color: colors.textMuted, textAlign: 'center' } });
