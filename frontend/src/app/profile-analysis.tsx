import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AnalysisLogo } from '@/components/brand/AnalysisLogo';
import { AnalysisPanel } from '@/components/analysis/AnalysisPanel';
import { ProgressGauge } from '@/components/analysis/ProgressGauge';
import { AppScreen } from '@/components/layout/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { colors, spacing, typography } from '@/theme/tokens';

export default function ProfileAnalysisScreen() {
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setCompleted(true), 2400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!completed) return;
    const timer = setTimeout(() => router.replace('/profile'), 5000);
    return () => clearTimeout(timer);
  }, [completed]);

  return (
    <AppScreen navigation scroll={false} contentStyle={styles.container}>
      <View style={styles.heading}><Text style={styles.headingTitle}>나만의 GO. 설정하기</Text><Text style={styles.headingDescription}>내 머릿속에 존재하는 모습을 목표로 세워보세요.</Text></View>
      <AnalysisPanel><View style={styles.center}>
        <AnalysisLogo completed={completed} />
        {completed ? (
          <>
            <Text style={styles.title}>분석 완료!</Text>
            <Text style={styles.description}>프로필이 생성되었어요!{`\n`}5초 후 프로필 화면으로 넘어가요.</Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>분석 중...</Text>
            <Text style={styles.description}>입력하신 정보를 토대로 프로필을{`\n`}생성중이에요.</Text>
            {/* 프로필 생성은 서버가 진행률을 주지 않는다. 숫자를 지어내지 않는다. */}
            <ProgressGauge label="프로필 만드는 중" />
          </>
        )}
      </View></AnalysisPanel>

      <View style={styles.bottom}>
        {completed ? (
          <AppButton label="바로 프로필 화면으로 이동하기" onPress={() => router.replace('/profile')} />
        ) : (
          null
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 8, gap: 12 }, heading: { gap: 3 }, headingTitle: { ...typography.h1, color: colors.text }, headingDescription: { ...typography.body, color: colors.textTertiary },
  center: { flexGrow: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, gap: spacing.md },
  title: { ...typography.title, color: colors.text, textAlign: 'center' },
  description: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  bottom: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: 42, gap: spacing.md },
});
