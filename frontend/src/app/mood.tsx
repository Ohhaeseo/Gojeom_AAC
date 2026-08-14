/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from 'react';
import { Redirect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { PriorityPicker, type PriorityCategory } from '@/components/priority/PriorityPicker';
import { AppButton } from '@/components/ui/AppButton';
import { colors, spacing, typography } from '@/theme/tokens';

export default function MoodScreen() {
  return <Redirect href="/priority" />;
/*
  const [selected, setSelected] = useState<PriorityCategory[]>([]);

  return (
    <Screen contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>우선순위를 정해주세요</Text>
        <Text style={styles.description}>더 중요하게 생각하는 항목을 순서대로 최대 3개 선택해주세요. {selected.length}/3</Text>
      </View>
      <PriorityPicker selected={selected} onChange={setSelected} />
      <View style={styles.spacer} />
      <AppButton label="다음으로" disabled={selected.length === 0} onPress={() => router.push('/profile-analysis')} />
      <Text style={styles.note}>선택하지 않아도 다음 단계에서 동일한 가중치로 분석할 수 있어요.</Text>
    </Screen>
  );
*/}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  header: { gap: spacing.sm },
  title: { ...typography.title, color: colors.text },
  description: { ...typography.body, color: colors.textMuted },
  spacer: { flex: 1, minHeight: spacing.xxl },
  note: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
