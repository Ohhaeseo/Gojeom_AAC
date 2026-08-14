import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/layout/AppScreen';
import { OfficialFaceLogo } from '@/components/brand/OfficialLogos';
import { useAppState } from '@/state/AppState';
import { colors, radius, shadow, spacing, typography } from '@/theme/tokens';

export default function DrawerScreen() {
  const { saved, hasAnalysis } = useAppState();
  return (
    <AppScreen navigation contentStyle={styles.content}>
      <Text style={styles.title}>현재 진행중인 목표</Text><Text style={styles.description}>목표로 생성되어 진행 중인 분석을 보여줘요.</Text>{saved ? <ResultCard title="17호, 큰 눈, 귀족턱, 다..." /> : <View style={styles.empty}><Text style={styles.emptyTitle}>아직 진행중인 목표가 없어요...</Text><Text style={styles.body}>여기를 눌러 최근 분석 결과 중에서{`\n`}목표를 생성할 수 있어요.</Text></View>}
      <Text style={styles.title}>최근 분석 결과</Text><Text style={styles.description}>한달 내 저장한 고점 분석 결과를 확인할 수 있어요.</Text>{hasAnalysis ? <ResultCard title="맑고 청순한 인상" /> : <EmptyAnalysis />}
      <Text style={styles.title}>전체</Text><Text style={styles.description}>그동안 분석한 목표를 전부 볼 수 있어요.</Text>{hasAnalysis ? <ResultCard title="맑고 청순한 인상" /> : <EmptyAnalysis />}
    </AppScreen>
  );
}
function ResultCard({ title }: { title: string }) { return <Pressable onPress={() => router.push({ pathname: '/analysis-result', params: { source: 'drawer' } })} style={styles.card}><OfficialFaceLogo size={104} /><View style={styles.copy}><Text style={styles.date}>2026. 08. 10 분석</Text><Text style={styles.cardTitle}>{title}</Text><Text style={styles.date}>고점 달성 진행률</Text><View style={styles.track}><View style={styles.fill} /></View></View><Text style={styles.arrow}>›</Text></Pressable>; }
function EmptyAnalysis() { return <View style={styles.empty}><Text style={styles.emptyTitle}>아직 분석 결과가 없어요.</Text><Text style={styles.body}>새로 진단을 완료하면 이곳에 결과가 표시돼요.</Text></View>; }
const styles = StyleSheet.create({ content: { gap: spacing.md }, title: { ...typography.h1, color: colors.text, marginTop: spacing.sm }, description: { ...typography.body, color: colors.textMuted }, card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primaryLight, backgroundColor: colors.surface, ...shadow }, image: { width: 104, height: 104, borderRadius: radius.md, backgroundColor: '#DFFFF4' }, copy: { flex: 1, justifyContent: 'center', gap: 7 }, date: { ...typography.caption, color: colors.textMuted }, cardTitle: { ...typography.label, color: colors.text }, body: { ...typography.body, color: colors.textTertiary, textAlign: 'center' }, empty: { minHeight: 145, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow }, emptyTitle: { ...typography.title, color: colors.text }, track: { height: 14, overflow: 'hidden', borderRadius: 7, backgroundColor: colors.disabled }, fill: { width: '76%', height: '100%', borderRadius: 7, backgroundColor: colors.primaryLight }, arrow: { alignSelf: 'flex-start', fontSize: 28, color: colors.textMuted } });
