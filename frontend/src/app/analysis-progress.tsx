import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';

import { AnalysisLogo } from '@/components/brand/AnalysisLogo';
import { AnalysisPanel } from '@/components/analysis/AnalysisPanel';
import { AppScreen } from '@/components/layout/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { useAppState } from '@/state/AppState';
import { colors, radius, shadow, spacing, typography } from '@/theme/tokens';

const keywords = ['다이아몬드형', '귀족턱', '17호 피부', '큰 눈'];
type Phase = 'extracting' | 'keyword-ready' | 'keywords' | 'generating' | 'done';

export default function AnalysisProgressScreen() {
  const { completeAnalysis } = useAppState();
  const [phase, setPhase] = useState<Phase>('extracting');
  const [selected, setSelected] = useState<string[]>(['다이아몬드형', '17호 피부', '큰 눈']);
  useEffect(() => { if (phase !== 'extracting') return; const id = setTimeout(() => setPhase('keyword-ready'), 2000); return () => clearTimeout(id); }, [phase]);
  useEffect(() => { if (phase !== 'keyword-ready') return; const id = setTimeout(() => setPhase('keywords'), 700); return () => clearTimeout(id); }, [phase]);
  useEffect(() => { if (phase !== 'generating') return; const done = setTimeout(() => { completeAnalysis(); setPhase('done'); }, 2200); return () => clearTimeout(done); }, [completeAnalysis, phase]);
  useEffect(() => { if (phase !== 'done') return; const move = setTimeout(() => router.replace('/analysis-result'), 5000); return () => clearTimeout(move); }, [phase]);
  const completed = phase === 'done';
  const statusTitle = completed ? '분석 완료!✓' : phase === 'extracting' ? '키워드 추출 중...' : phase === 'keyword-ready' ? '키워드 추출 완료!' : '분석 중...86%';
  const statusDescription = completed ? '고점 분석을 완료했어요!\n5초 후 결과 화면으로 넘어가요.' : phase === 'extracting' ? '입력하신 정보에서 나를 표현하는\n키워드를 찾고 있어요.' : phase === 'keyword-ready' ? '키워드를 모두 찾았어요.\n선택 화면을 준비하고 있어요.' : '입력하신 정보를 토대로 프로필을\n생성중이에요.';
  return (
    <AppScreen navigation scroll={false} contentStyle={styles.content}>
      <View><Text style={styles.heading}>고점 분석하기</Text><Text style={styles.headingDescription}>입력한 정보를 바탕으로 고점을 분석 중이에요.</Text></View>
      <AnalysisPanel><View style={styles.center}><AnalysisLogo completed={completed} /><Text style={styles.title}>{statusTitle}</Text><Text style={styles.description}>{statusDescription}</Text>{completed ? <AppButton label="바로 결과 확인하기" variant="secondary" onPress={() => router.replace('/analysis-result')} /> : null}</View></AnalysisPanel>
      <Modal transparent visible={phase === 'keywords'} animationType="fade"><View style={styles.modalRoot}><BlurView intensity={18} tint="light" style={StyleSheet.absoluteFill} /><View style={styles.dim} /><View style={styles.modalCard}><Text style={styles.modalTitle}>키워드를 추출했어요.</Text><Text style={styles.modalDescription}>분석하는 동안 키워드를 선택해주세요.</Text><View style={styles.keywords}>{keywords.map((keyword) => { const active = selected.includes(keyword); return <Pressable key={keyword} onPress={() => setSelected((current) => active ? current.filter((item) => item !== keyword) : current.length < 4 ? [...current, keyword] : current)} style={styles.keyword}><View style={[styles.checkbox, active && styles.checkboxActive]}><Text style={styles.check}>{active ? '✓' : ''}</Text></View><Text style={styles.keywordText}>{keyword}</Text></Pressable>; })}</View><AppButton label="키워드 선택 저장하기" disabled={!selected.length} onPress={() => setPhase('generating')} /></View></View></Modal>
    </AppScreen>
  );
}
const styles = StyleSheet.create({ content: { gap: 8 }, heading: { ...typography.h1, color: colors.text }, headingDescription: { ...typography.body, color: colors.textTertiary }, center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.md }, title: { ...typography.title, color: colors.text, textAlign: 'center' }, description: { ...typography.body, color: colors.textMuted, textAlign: 'center' }, modalRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }, dim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(18,29,45,0.18)' }, modalCard: { width: '100%', maxWidth: 360, gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow }, modalTitle: { ...typography.title, color: colors.text }, modalDescription: { ...typography.body, color: colors.textMuted }, keywords: { gap: 10 }, keyword: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 8 }, checkbox: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.textMuted, borderRadius: 4, backgroundColor: colors.surface }, checkboxActive: { borderColor: colors.primary, backgroundColor: colors.primary }, check: { color: colors.white, fontWeight: '700' }, keywordText: { ...typography.body, color: colors.text } });
