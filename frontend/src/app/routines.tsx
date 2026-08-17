import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';

import { AppScreen } from '@/components/layout/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AnimatedSwitch } from '@/components/ui/AnimatedSwitch';
import { formatAnalyzedDate } from '@/lib/date';
import { useAppState } from '@/state/AppState';
import { colors, radius, shadow, spacing, typography } from '@/theme/tokens';

export default function RoutinesScreen() {
  const { tasks, toggleTask, result, hasAnalysis } = useAppState(); const [notification, setNotification] = useState(true);
  if (!hasAnalysis || !result) {
    return <AppScreen navigation contentStyle={styles.content}><View style={styles.empty}><Text style={styles.emptyTitle}>아직 생성된 루틴이 없어요.</Text><Text style={styles.description}>새로 진단을 완료하면 분석 결과를 바탕으로 맞춤 루틴이 생성돼요.</Text><AppButton label="새로 진단하기" onPress={() => router.push('/analysis-new')} /></View></AppScreen>;
  }
  return (
    <AppScreen navigation contentStyle={styles.content}>
      <Text style={styles.title}>{result.title}</Text><Text style={styles.description}>{formatAnalyzedDate(result.analyzedAt)}</Text>
      <View style={styles.summary}><View style={styles.chips}>{result.overview.keywords.slice(0, 2).map((item) => <View key={item.id} style={styles.chip}><Text style={styles.chipText}>{item.label}</Text></View>)}</View>{[['유지할 점', result.overview.keepPoints.join(', ')], ['강조할 점', result.overview.emphasizePoints.join(', ')], ['변화 강도', result.overview.changeIntensity.join(', ')]].map(([label, value]) => <View key={label} style={styles.summaryRow}><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryValue}>{value}</Text></View>)}</View>
      <Text style={styles.sectionTitle}>AI 추천 목표</Text><Text style={styles.description}>AI가 고점을 기반으로 추천하는 웰니스 활동이에요.</Text>
      {tasks.map((task) => <Pressable key={task.taskId} onPress={() => toggleTask(task.taskId)} style={[styles.task, task.status === 'DONE' && styles.taskDone]}><View style={styles.taskCopy}><Text style={[styles.taskTitle, task.status === 'DONE' && styles.doneText]}>{task.title}</Text><Text style={styles.meta}>{task.timing} / {task.durationLabel} / {task.amountLabel}</Text></View><View style={styles.completeRow}><View style={[styles.checkbox, task.status === 'DONE' && styles.checkboxDone]}><Text style={styles.check}>{task.status === 'DONE' ? '✓' : ''}</Text></View><Text style={styles.completeText}>완료</Text></View></Pressable>)}
      <Text style={styles.sectionTitle}>알림 설정</Text><Text style={styles.description}>목표 알림을 받을 시간을 직접 설정해 보세요.</Text><View style={styles.alarm}><View><Text style={styles.taskTitle}>루틴 알림</Text><Text style={styles.meta}>설정한 시간에 루틴 알림을 받을게요.</Text></View><AnimatedSwitch accessibilityLabel="루틴 알림" value={notification} onValueChange={setNotification} /></View>
    </AppScreen>
  );
}
const styles = StyleSheet.create({ content: { gap: spacing.md }, empty: { minHeight: 560, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.lg }, emptyTitle: { ...typography.title, color: colors.text, textAlign: 'center' }, title: { ...typography.h1, color: colors.text }, sectionTitle: { ...typography.h1, color: colors.text }, description: { ...typography.body, color: colors.textMuted, textAlign: 'center' }, summary: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow }, chips: { flexDirection: 'row', gap: 12 }, chip: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.primary }, chipText: { ...typography.label, color: colors.white }, summaryRow: { flexDirection: 'row', gap: 18 }, summaryLabel: { width: 72, ...typography.body, color: colors.textTertiary }, summaryValue: { flex: 1, ...typography.body, color: colors.text }, task: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: '#DFE7E5' }, taskDone: { opacity: 0.68 }, taskCopy: { flex: 1, gap: 5 }, taskTitle: { ...typography.body, color: colors.text }, doneText: { color: colors.textMuted }, meta: { ...typography.caption, color: colors.textTertiary }, completeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, checkbox: { width: 21, height: 21, alignItems: 'center', justifyContent: 'center', borderRadius: 4, borderWidth: 1, borderColor: colors.textMuted, backgroundColor: colors.surface }, checkboxDone: { borderColor: colors.primary, backgroundColor: colors.primary }, check: { color: colors.white, fontWeight: '700' }, completeText: { ...typography.body, color: colors.text }, alarm: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow } });
