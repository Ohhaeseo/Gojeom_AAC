/* eslint-disable @typescript-eslint/no-unused-vars */
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AnalysisLogo } from '@/components/brand/AnalysisLogo';
import { Screen } from '@/components/layout/Screen';
import { AppButton } from '@/components/ui/AppButton';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function GoalAnalysisScreen() {
  return <Redirect href="/goal" />;
/*
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setCompleted(true), 2400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Screen contentContainerStyle={styles.container} scrollEnabled={false}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="뒤로가기" hitSlop={12} onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{completed ? '목표 설계 완료' : '목표 설계 중'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.center}>
        <AnalysisLogo completed={completed} />
        {completed ? (
          <>
            <Text style={styles.title}>나만의 목표를 정리했어요</Text>
            <Text style={styles.description}>선택한 우선순위와 추구미를 바탕으로 변화 방향을 준비했어요.</Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>추구미에 가까워지는 길을 설계하고 있어요</Text>
            <Text style={styles.description}>선택한 키워드와 우선순위를 조합해 나에게 맞는 방향을 찾고 있어요.</Text>
            <ActivityIndicator color={colors.primary} size="small" style={styles.spinner} />
          </>
        )}
      </View>

      <View style={styles.bottom}>
        {completed ? (
          <AppButton label="분석 결과 보기" onPress={() => {}} />
        ) : (
          <Text style={styles.notice}>목표 설계가 끝나면 결과를 바로 확인할 수 있어요.</Text>
        )}
        <Text style={styles.disclaimer}>AI가 생성한 관리 방향은 참고용이며 의료적 진단이나 결과를 보장하지 않습니다.</Text>
      </View>
    </Screen>
  );
*/}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 0, paddingTop: 0 },
  header: { height: 64, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: colors.text, fontSize: 42, fontWeight: '300', lineHeight: 42, marginTop: -5 },
  headerTitle: { ...typography.label, color: colors.text },
  headerSpacer: { width: 44 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.md },
  title: { ...typography.title, color: colors.text, textAlign: 'center' },
  description: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  spinner: { marginTop: spacing.md },
  bottom: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  notice: { ...typography.caption, color: colors.textMuted, textAlign: 'center', backgroundColor: '#E7F6F0', borderRadius: radius.md, padding: spacing.md },
  disclaimer: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
