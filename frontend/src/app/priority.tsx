import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/layout/AppScreen';
import { PriorityPicker } from '@/components/priority/PriorityPicker';
import { ProfilePhotoPanel } from '@/components/profile/ProfileSetupSummary';
import { AppButton } from '@/components/ui/AppButton';
import { useAppState } from '@/state/AppState';
import { colors, spacing, typography } from '@/theme/tokens';

export default function PriorityScreen() {
  const { priorities, setPriorities, photoUri } = useAppState();
  return (
    <AppScreen navigation contentStyle={styles.content}>
      <Text style={styles.photoHeading}>내 사진 등록하기</Text><ProfilePhotoPanel photoUri={photoUri} />
      <View style={styles.heading}>
        <Text style={styles.title}>우선 순위 등록하기</Text>
        <Text style={styles.description}>AI가 우선 순위를 기준으로 더 자세히 분석해요.</Text>
      </View>
      <PriorityPicker selected={priorities} onChange={setPriorities} />
      <Text style={styles.guideText}>*선택한 순서대로 등록돼요. 다음 단계로 가기 전까지 자유롭게 변경할 수 있어요.</Text>
      <AppButton label="다음" disabled={priorities.length !== 3} onPress={() => router.push('/body-info')} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md }, photoHeading: { ...typography.h1, color: colors.textTertiary }, heading: { gap: spacing.sm, marginTop: 8 }, title: { ...typography.h1, color: colors.text },
  description: { ...typography.body, color: colors.textMuted }, guideText: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
