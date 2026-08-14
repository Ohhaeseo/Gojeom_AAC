import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnalysisLogo } from '@/components/brand/AnalysisLogo';
import { AppScreen } from '@/components/layout/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { useAppState } from '@/state/AppState';
import { colors, radius, shadow, spacing, typography } from '@/theme/tokens';

type Overlay = 'none' | 'loading' | 'done';
const comparison = require('../../assets/comparison-before-after-reference.png');

export default function GoalScreen() {
  const { result } = useAppState();
  const [overlay, setOverlay] = useState<Overlay>('none');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (overlay !== 'loading') return;
    const id = setTimeout(() => setOverlay('done'), 2300);
    return () => clearTimeout(id);
  }, [overlay]);

  useEffect(() => {
    if (overlay !== 'done') return;
    const id = setTimeout(() => router.replace('/routines'), 5000);
    return () => clearTimeout(id);
  }, [overlay]);

  const openRoutines = () => {
    setOverlay('none');
    router.replace('/routines');
  };

  return (
    <AppScreen navigation contentStyle={styles.content}>
      <Text style={styles.title}>{result.title}</Text>
      <Text style={styles.description}>2026.08.12</Text>
      <Image source={comparison} contentFit="cover" style={styles.comparison} />

      <Text style={styles.sectionTitle}>한눈에 보는 고점 요약</Text>
      <Text style={styles.description}>사용자가 구성한 정보를 중심으로 이루어진 요약이에요.</Text>
      <View style={styles.card}>
        <View style={styles.chips}>{result.overview.keywords.slice(0, 2).map((item) => <View key={item.id} style={styles.chip}><Text style={styles.chipText}>{item.label}</Text></View>)}</View>
        {[['유지할 점', result.overview.keepPoints.join(', ')], ['강조할 점', result.overview.emphasizePoints.join(', ')], ['변화 강도', result.overview.changeIntensity.join(', ')]].map(([label, value]) => <View key={label} style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>)}
      </View>

      <Text style={styles.sectionTitle}>이렇게 바꾸면 가까워져요</Text>
      <Text style={styles.description}>현재 모습과 추구미 사이에서 우선순위가 높은 변화예요.</Text>
      <View style={styles.card}>{result.categoryChanges.map((item) => <View key={item.category} style={styles.change}><View style={styles.chip}><Text style={styles.chipText}>{{ SKIN: '피부', BODY: '체형', HEALTH: '건강' }[item.category]}</Text></View><Text style={styles.body}>{item.description}</Text></View>)}</View>

      <Text style={styles.sectionTitle}>오늘 당장 해볼 수 있는 관리</Text>
      <Text style={styles.description}>큰 변화보다 일상에서부터 시작할 수 있는 방법이에요.</Text>
      <View style={styles.card}>{result.dailyCares.map((item) => <View key={item.title} style={styles.change}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.body}>{item.description}</Text></View>)}</View>

      <Text style={styles.question}>결과가 마음에 든다면?</Text>
      <AppButton label="맞춤형 목표로 설정하기" onPress={() => setOverlay('loading')} />

      <Modal transparent visible={overlay !== 'none'} animationType="fade" presentationStyle="overFullScreen" statusBarTranslucent>
        <View style={[styles.overlayRoot, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 20) }]}>
          <BlurView intensity={18} tint="light" style={StyleSheet.absoluteFill} />
          <View style={styles.dim} />
          <View style={styles.overlayCenter}>
            <AnalysisLogo completed={overlay === 'done'} />
            <Text style={styles.overlayTitle}>{overlay === 'done' ? '목표 설계 완료!✓' : '목표 설계 중...86%'}</Text>
            <Text style={styles.overlayDescription}>{overlay === 'done' ? '맞춤 루틴을 만들었어요.\n5초 후 루틴 화면으로 넘어가요.' : '분석 결과를 바탕으로\n맞춤 루틴을 만들고 있어요.'}</Text>
          </View>
          {overlay === 'done' ? <View style={styles.overlayButton}><AppButton label="바로 루틴 확인하기" variant="secondary" onPress={openRoutines} /></View> : null}
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  title: { ...typography.h1, color: colors.text },
  sectionTitle: { ...typography.h1, color: colors.text, marginTop: spacing.sm },
  description: { ...typography.body, color: colors.textMuted },
  comparison: { width: '100%', aspectRatio: 1.08, borderRadius: radius.lg },
  card: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow },
  cardTitle: { ...typography.subtitle, color: colors.text },
  chips: { flexDirection: 'row', gap: 12 },
  chip: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.primary },
  chipText: { ...typography.label, color: colors.white },
  row: { flexDirection: 'row', gap: 18 },
  rowLabel: { width: 72, ...typography.body, color: colors.textTertiary },
  rowValue: { flex: 1, ...typography.body, color: colors.text },
  change: { gap: 8 },
  body: { ...typography.body, color: colors.textTertiary },
  question: { ...typography.label, color: colors.text, textAlign: 'center' },
  overlayRoot: { flex: 1, paddingHorizontal: 45 },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(18,29,45,0.18)' },
  overlayCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  overlayTitle: { ...typography.title, color: colors.text, textAlign: 'center' },
  overlayDescription: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  overlayButton: { width: '100%', marginBottom: 28 },
});
