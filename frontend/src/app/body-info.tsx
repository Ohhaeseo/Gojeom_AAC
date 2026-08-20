import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/layout/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';
import { ProfilePhotoPanel, PrioritySummary } from '@/components/profile/ProfileSetupSummary';
import { useAppState } from '@/state/AppState';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function BodyInfoScreen() {
  const params = useLocalSearchParams<{ edit?: string }>();
  const { photoUri, priorities, profile } = useAppState();
  const [height, setHeight] = useState(() => params.edit === '1' && profile ? String(profile.heightCm) : '');
  const [weight, setWeight] = useState(() => params.edit === '1' && profile ? String(profile.weightKg) : '');
  // 서버 제약과 같은 범위를 쓴다. 넓게 두면 제출 순간에 400이 난다. (API.md §6.3)
  const valid = Number(height) >= 100 && Number(height) <= 250 && Number(weight) >= 30 && Number(weight) <= 200;
  return (
    <AppScreen navigation contentStyle={styles.content}>
      <Text style={styles.previous}>내 사진 등록하기</Text><ProfilePhotoPanel photoUri={photoUri} />
      <Text style={styles.previous}>우선 순위 등록하기</Text><PrioritySummary priorities={priorities} />
      <Text style={styles.title}>신체 정보 입력하기</Text><Text style={styles.description}>키, 몸무게, 인바디 등을 통해 맞춤형 분석이 가능해요.</Text><Text style={styles.required}>필수 정보<Text style={styles.requiredMark}>*</Text></Text>
      <View style={styles.fields}><View style={styles.half}><FormField label="키" required value={height} onChangeText={setHeight} placeholder="cm" keyboardType="decimal-pad" /></View><View style={styles.half}><FormField label="몸무게" required value={weight} onChangeText={setWeight} placeholder="kg" keyboardType="decimal-pad" /></View></View>
      <AppButton label="다음" disabled={!valid} onPress={() => router.push({ pathname: '/optional-info', params: { height, weight, edit: params.edit ?? '0' } })} />
    </AppScreen>
  );
}
const styles = StyleSheet.create({ content: { gap: spacing.md }, previous: { ...typography.h1, color: colors.textTertiary }, title: { ...typography.h1, color: colors.text }, description: { ...typography.body, color: colors.textMuted }, required: { ...typography.label, color: colors.text }, requiredMark: { color: colors.danger }, fields: { flexDirection: 'row', gap: 12, padding: spacing.md, borderRadius: radius.lg, backgroundColor: '#DFE7E5' }, half: { flex: 1 } });
