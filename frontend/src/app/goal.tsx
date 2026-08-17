import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnalysisLogo } from '@/components/brand/AnalysisLogo';
import { ComparisonImage } from '@/components/analysis/ComparisonImage';
import { ProgressGauge } from '@/components/analysis/ProgressGauge';
import { AppScreen } from '@/components/layout/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { formatAnalyzedDate } from '@/lib/date';
import { useAppState } from '@/state/AppState';
import { colors, radius, shadow, spacing, typography } from '@/theme/tokens';

type Overlay = 'none' | 'loading' | 'done';

export default function GoalScreen() {
  const { result, ensureRoutine, loadDrawer } = useAppState();
  const [overlay, setOverlay] = useState<Overlay>('none');
  const [error, setError] = useState('');
  const insets = useSafeAreaInsets();
  // 결과가 메모리에 없다고 해서 "분석이 없다"는 뜻은 아니다. 새로고침하면
  // `result`가 비므로 저장된 것이 있는지는 **서버에 물어본다.** (오답 노트 N-12)
  const [savedCount, setSavedCount] = useState<number>();

  useEffect(() => {
    if (result) return;
    let alive = true;
    loadDrawer()
      .then((sections) => { if (alive) setSavedCount(sections.all.length); })
      .catch(() => { if (alive) setSavedCount(0); });
    return () => { alive = false; };
  }, [loadDrawer, result]);

  // 목표 생성은 AI 호출이라 몇 초 걸린다. 오버레이를 띄운 채 실제 응답을 기다린다.
  const createRoutine = async () => {
    setOverlay('loading'); setError('');
    const outcome = await ensureRoutine();
    if (!outcome.ok) { setOverlay('none'); setError(outcome.message ?? '목표를 만들지 못했어요.'); return; }
    setOverlay('done');
  };

  useEffect(() => {
    if (overlay !== 'done') return;
    const id = setTimeout(() => router.replace('/routines'), 5000);
    return () => clearTimeout(id);
  }, [overlay]);

  const openRoutines = () => {
    setOverlay('none');
    router.replace('/routines');
  };

  if (!result) return <NoResult savedCount={savedCount} />;

  return (
    <AppScreen navigation contentStyle={styles.content}>
      <Text style={styles.title}>{result.title}</Text>
      <Text style={styles.description}>{formatAnalyzedDate(result.analyzedAt)}</Text>
      <ComparisonImage image={result.comparisonImage} aspectRatio={1.08} />

      <Text style={styles.sectionTitle}>한눈에 보는 고점 요약</Text>
      <Text style={styles.description}>사용자가 구성한 정보를 중심으로 이루어진 요약이에요.</Text>
      <View style={styles.card}>
        <View style={styles.chips}>{result.overview.keywords.slice(0, 2).map((item) => <View key={item.id} style={styles.chip}><Text style={styles.chipText}>{item.label}</Text></View>)}</View>
        {[['유지할 점', result.overview.keepPoints.join(', ')], ['강조할 점', result.overview.emphasizePoints.join(', ')], ['변화 강도', result.overview.changeIntensity.join(', ')]].map(([label, value]) => <View key={label} style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>)}
      </View>

      <Text style={styles.sectionTitle}>이렇게 바꾸면 가까워져요</Text>
      <Text style={styles.description}>현재 모습과 고점 사이에서 우선순위가 높은 변화예요.</Text>
      <View style={styles.card}>{result.categoryChanges.map((item) => <View key={item.category} style={styles.change}><View style={styles.chip}><Text style={styles.chipText}>{{ SKIN: '피부', BODY: '체형', HEALTH: '건강' }[item.category]}</Text></View><Text style={styles.body}>{item.description}</Text></View>)}</View>

      <Text style={styles.sectionTitle}>오늘 당장 해볼 수 있는 관리</Text>
      <Text style={styles.description}>큰 변화보다 일상에서부터 시작할 수 있는 방법이에요.</Text>
      <View style={styles.card}>{result.dailyCares.map((item) => <View key={item.title} style={styles.change}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.body}>{item.description}</Text></View>)}</View>

      <Text style={styles.question}>결과가 마음에 든다면?</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <AppButton label="맞춤형 목표로 설정하기" onPress={createRoutine} />

      <Modal transparent visible={overlay !== 'none'} animationType="fade" presentationStyle="overFullScreen" statusBarTranslucent>
        <View style={[styles.overlayRoot, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 20) }]}>
          <BlurView intensity={18} tint="light" style={StyleSheet.absoluteFill} />
          <View style={styles.dim} />
          <View style={styles.overlayCenter}>
            <AnalysisLogo completed={overlay === 'done'} />
            <Text style={styles.overlayTitle}>{overlay === 'done' ? '목표 설계 완료!✓' : '목표 설계 중...'}</Text>
            <Text style={styles.overlayDescription}>{overlay === 'done' ? '맞춤 루틴을 만들었어요.\n5초 후 루틴 화면으로 넘어가요.' : '분석 결과를 바탕으로\n맞춤 루틴을 만들고 있어요.'}</Text>
            {/*
              목표 생성은 폴링이 없는 동기 호출이라 **서버가 진행률을 주지 않는다.**
              예전에는 `86%`가 박혀 있었는데, 늘 86%에 멈춘 게이지는 아무것도
              알려주지 않으면서 알려주는 척한다. 퍼센트 없이 진행 중임만 보인다.
            */}
            {overlay === 'done' ? null : <ProgressGauge label="맞춤 루틴 만드는 중" />}
          </View>
          {overlay === 'done' ? <View style={styles.overlayButton}><AppButton label="바로 루틴 확인하기" variant="secondary" onPress={openRoutines} /></View> : null}
        </View>
      </Modal>
    </AppScreen>
  );
}

/**
 * 분석 결과 없이 들어왔을 때. **막다른 길을 만들지 않는다.**
 *
 * 예전에는 `고점 분석하기` 버튼 하나뿐이었다. 이제 진단 없이도 목표를 만들 수
 * 있으므로(경로 B) 두 갈래를 준다. 서랍에 저장한 분석이 있으면 세 번째 갈래를
 * 덧붙인다 — 새로고침으로 메모리만 비었을 뿐 실제로는 결과가 있는 경우다. (N-12)
 */
function NoResult({ savedCount }: { savedCount?: number }) {
  const hasSaved = (savedCount ?? 0) > 0;
  return (
    <AppScreen navigation contentStyle={styles.content}>
      <View style={styles.emptyHead}>
        <Text style={styles.title}>아직 분석 결과가 없어요</Text>
        <Text style={styles.description}>편한 쪽으로 시작해보세요.</Text>
      </View>

      <Pressable accessibilityRole="button" onPress={() => router.replace('/analysis-new')} style={[styles.pathCard, styles.pathCardPrimary]}>
        <View style={styles.pathHead}><Text style={[styles.pathTitle, styles.pathTitleOn]}>고점 분석하기</Text><Text style={[styles.pathArrow, styles.pathTitleOn]}>›</Text></View>
        <Text style={[styles.pathText, styles.pathTextOn]}>사진과 우선순위로 지금 상태를 분석하고, 그 결과로 목표를 만들어요.</Text>
      </Pressable>

      <Pressable accessibilityRole="button" onPress={() => router.push('/routine-new')} style={styles.pathCard}>
        <View style={styles.pathHead}><Text style={styles.pathTitle}>진단 없이 목표 만들기</Text><Text style={styles.pathArrow}>›</Text></View>
        <Text style={styles.pathText}>카테고리와 기간만 골라 바로 시작해요.</Text>
      </Pressable>

      {hasSaved ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/drawer')} style={styles.pathCard}>
          <View style={styles.pathHead}><Text style={styles.pathTitle}>서랍에서 분석 가져오기</Text><Text style={styles.pathArrow}>›</Text></View>
          <Text style={styles.pathText}>저장한 분석 {savedCount}개가 있어요. 불러와서 목표를 만들 수 있어요.</Text>
        </Pressable>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  errorText: { ...typography.caption, color: colors.danger },
  content: { gap: spacing.md },
  emptyHead: { gap: 6, marginTop: spacing.lg, marginBottom: spacing.sm },
  pathCard: { gap: 8, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow },
  pathCardPrimary: { backgroundColor: colors.text },
  pathHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pathTitle: { ...typography.title, color: colors.text },
  pathTitleOn: { color: colors.white },
  pathArrow: { fontSize: 24, color: colors.textMuted },
  pathText: { ...typography.caption, color: colors.textMuted },
  pathTextOn: { color: colors.primaryLight },
  title: { ...typography.h1, color: colors.text },
  sectionTitle: { ...typography.h1, color: colors.text, marginTop: spacing.sm },
  description: { ...typography.body, color: colors.textMuted },
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
