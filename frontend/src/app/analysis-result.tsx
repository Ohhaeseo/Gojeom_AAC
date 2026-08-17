import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ComparisonImage } from '@/components/analysis/ComparisonImage';
import { KeywordText } from '@/components/analysis/KeywordText';
import { AppScreen } from '@/components/layout/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { GoModal } from '@/components/ui/GoModal';
import { formatAnalyzedDate } from '@/lib/date';
import { useAppState } from '@/state/AppState';
import { colors, radius, shadow, spacing, typography } from '@/theme/tokens';

const labels = { SKIN: '피부', BODY: '체형', HEALTH: '건강' } as const;
export default function AnalysisResultScreen() {
  const { result, saved, saveToDrawer } = useAppState(); const [confirm, setConfirm] = useState(false); const [error, setError] = useState('');
  const { source } = useLocalSearchParams<{ source?: string }>();
  const openedFromDrawer = source === 'drawer';
  // 결과가 없으면 분석부터 해야 한다. 빈 화면을 그리지 않는다.
  if (!result) return (
    <AppScreen navigation contentStyle={styles.content}>
      <Text style={styles.title}>아직 분석 결과가 없어요</Text>
      <Text style={styles.body}>고점을 입력하면 결과를 만들어 드려요.</Text>
      <AppButton label="고점 분석하기" onPress={() => router.replace('/analysis-new')} />
    </AppScreen>
  );
  const save = async () => {
    const outcome = await saveToDrawer();
    setConfirm(false);
    if (!outcome.ok) setError(outcome.message ?? '서랍에 저장하지 못했어요.');
  };
  // 사용자가 고른 키워드만 강조 대상이다.
  const picked = result.overview.keywords.filter((keyword) => keyword.selected).map((keyword) => keyword.label);

  return (
    <AppScreen navigation contentStyle={styles.content}>
      <Text style={styles.eyebrow}>나만의 고점 분석</Text><Text style={styles.title}>{result.title}</Text><Text style={styles.date}>{formatAnalyzedDate(result.analyzedAt)} 분석</Text>
      <ComparisonImage image={result.comparisonImage} />
      {/*
        **사용자가 고른 키워드**를 본문에서 강조한다. AI가 중요하다고 한 말이
        아니라 사용자의 선택이 기준이다 — 그래야 "내가 고른 것이 결과에 이렇게
        반영됐다"가 눈에 보인다. 고른 것이 없으면 아무것도 칠하지 않는다.
      */}
      <View style={styles.card}><Text style={styles.cardTitle}>고점 요약</Text><KeywordText keywords={picked} style={styles.body}>{result.overview.summary}</KeywordText><View style={styles.chips}>{result.overview.keywords.map((keyword) => <View key={keyword.id} style={[styles.chip, keyword.selected && styles.chipOn]}><Text style={styles.chipText}>{keyword.label}</Text></View>)}</View></View>
      <View style={styles.twoColumns}><View style={styles.smallCard}><Text style={styles.cardTitle}>유지할 점</Text>{result.overview.keepPoints.map((item) => <KeywordText key={item} keywords={picked} style={styles.body}>{`• ${item}`}</KeywordText>)}</View><View style={styles.smallCard}><Text style={styles.cardTitle}>강조할 점</Text>{result.overview.emphasizePoints.map((item) => <KeywordText key={item} keywords={picked} style={styles.body}>{`• ${item}`}</KeywordText>)}</View></View>
      <Text style={styles.sectionTitle}>카테고리별 변화 방향</Text>{result.categoryChanges.map((item) => <View key={item.category} style={styles.card}><Text style={styles.category}>{labels[item.category]}</Text><KeywordText keywords={picked} style={styles.body}>{item.description}</KeywordText></View>)}
      <Text style={styles.sectionTitle}>오늘부터 실천할 관리</Text>{result.dailyCares.map((item, index) => <View key={item.title} style={styles.care}><Text style={styles.number}>{index + 1}</Text><View style={styles.careCopy}><KeywordText keywords={picked} style={styles.cardTitle}>{item.title}</KeywordText><KeywordText keywords={picked} style={styles.body}>{item.description}</KeywordText></View></View>)}
      <View style={styles.notice}><Text style={styles.noticeText}>{result.disclaimer}</Text></View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {openedFromDrawer ? null : <AppButton label={saved ? '저장 완료' : '서랍에 저장하기'} disabled={saved} onPress={() => setConfirm(true)} />}<AppButton label="루틴으로 만들기" variant="dark" onPress={() => router.push('/goal')} />
      <GoModal visible={confirm} title="분석 결과를 저장할까요?" description="저장한 결과는 서랍에서 언제든 다시 볼 수 있어요." confirmLabel="저장하기" onClose={() => setConfirm(false)} onConfirm={save} />
    </AppScreen>
  );
}
const styles = StyleSheet.create({ content: { gap: spacing.md }, eyebrow: { ...typography.label, color: colors.primary }, title: { ...typography.h1, color: colors.text }, date: { ...typography.caption, color: colors.textMuted }, card: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow }, cardTitle: { ...typography.subtitle, color: colors.text }, body: { ...typography.body, color: colors.textTertiary }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chipOn: { borderWidth: 1, borderColor: colors.primaryPressed }, chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.primaryLight }, chipText: { ...typography.caption, color: colors.text }, twoColumns: { flexDirection: 'row', gap: spacing.sm }, smallCard: { flex: 1, minHeight: 150, gap: 8, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceSunken }, sectionTitle: { ...typography.title, color: colors.text, marginTop: spacing.sm }, category: { ...typography.label, color: colors.primary }, care: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface }, number: { ...typography.title, color: colors.primary }, careCopy: { flex: 1, gap: 6 }, notice: { padding: spacing.md, borderRadius: radius.md, backgroundColor: '#FFF1F1' }, noticeText: { ...typography.caption, color: colors.textTertiary }, errorText: { ...typography.caption, color: colors.danger } });
