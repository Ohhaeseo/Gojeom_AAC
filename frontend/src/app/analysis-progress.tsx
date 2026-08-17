import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';

import { AnalysisLogo } from '@/components/brand/AnalysisLogo';
import { AnalysisPanel } from '@/components/analysis/AnalysisPanel';
import { ProgressGauge } from '@/components/analysis/ProgressGauge';
import { AppScreen } from '@/components/layout/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { useAppState } from '@/state/AppState';
import { colors, radius, shadow, spacing, typography } from '@/theme/tokens';

/** 키워드는 1~4개까지 고를 수 있다. (API.md §6.4 · PRD F-06) */
const MAX_SELECT = 4;

type Phase = 'extracting' | 'keywords' | 'generating' | 'done' | 'failed';

export default function AnalysisProgressScreen() {
  const params = useLocalSearchParams<{ input?: string; images?: string }>();
  const { startAnalysis, confirmKeywords, analysisKeywords, analysisStatusText, analysisPercent, mode } = useAppState();

  const [phase, setPhase] = useState<Phase>('extracting');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const started = useRef(false);

  const inputText = params.input ?? '';
  const imageUris = (() => {
    try { return params.images ? (JSON.parse(params.images) as string[]) : []; } catch { return []; }
  })();

  // 키워드 추출까지 진행한다. StrictMode의 이중 실행을 ref로 막는다.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      const result = await startAnalysis(inputText, imageUris);
      if (!result.ok) { setError(result.message ?? '분석을 시작하지 못했어요.'); setPhase('failed'); return; }
      setPhase('keywords');
    })();
  }, [imageUris, inputText, startAnalysis]);

  const submitKeywords = useCallback(async () => {
    setPhase('generating');
    const result = await confirmKeywords(selected);
    if (!result.ok) { setError(result.message ?? '결과를 만들지 못했어요.'); setPhase('failed'); return; }
    setPhase('done');
  }, [confirmKeywords, selected]);

  // 완료 후 5초 뒤 결과지로 넘어간다. (시안 16)
  useEffect(() => {
    if (phase !== 'done') return;
    const move = setTimeout(() => router.replace('/analysis-result'), 5000);
    return () => clearTimeout(move);
  }, [phase]);

  const completed = phase === 'done';
  const failed = phase === 'failed';

  const statusTitle = failed ? '분석에 실패했어요'
    : completed ? '분석 완료!✓'
    : phase === 'generating' ? '분석 중...'
    : '키워드 추출 중...';

  const statusDescription = failed ? error
    : completed ? '고점 분석을 완료했어요!\n5초 후 결과 화면으로 넘어가요.'
    : analysisStatusText || (mode === 'mock'
      ? '입력하신 정보에서 나를 표현하는\n키워드를 찾고 있어요.'
      : '서버에서 분석을 진행하고 있어요.');

  return (
    <AppScreen navigation scroll={false} contentStyle={styles.content}>
      <View><Text style={styles.heading}>고점 분석하기</Text><Text style={styles.headingDescription}>입력한 정보를 바탕으로 고점을 분석 중이에요.</Text></View>
      <AnalysisPanel>
        <View style={styles.center}>
          <AnalysisLogo completed={completed} />
          <Text style={styles.title}>{statusTitle}</Text>
          <Text style={styles.description}>{statusDescription}</Text>
          {/* 끝났거나 실패한 뒤에는 게이지를 치운다. 남겨두면 아직 도는 것처럼 보인다. */}
          {!completed && !failed ? <ProgressGauge percent={analysisPercent} label={statusTitle.replace('...', '')} /> : null}
          {completed ? <AppButton label="바로 결과 확인하기" variant="secondary" onPress={() => router.replace('/analysis-result')} /> : null}
          {failed ? <AppButton label="다시 시도하기" variant="secondary" onPress={() => router.replace('/analysis-new')} /> : null}
        </View>
      </AnalysisPanel>

      <Modal transparent visible={phase === 'keywords' && analysisKeywords.length > 0} animationType="fade">
        <View style={styles.modalRoot}>
          <BlurView intensity={18} tint="light" style={StyleSheet.absoluteFill} />
          <View style={styles.dim} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>키워드를 추출했어요.</Text>
            <Text style={styles.modalDescription}>마음에 드는 키워드를 최대 {MAX_SELECT}개까지 골라주세요.</Text>
            <View style={styles.keywords}>
              {analysisKeywords.map((keyword) => {
                const active = selected.includes(keyword.id);
                return (
                  <Pressable
                    key={keyword.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active }}
                    onPress={() => setSelected((current) => active
                      ? current.filter((id) => id !== keyword.id)
                      : current.length < MAX_SELECT ? [...current, keyword.id] : current)}
                    style={styles.keyword}
                  >
                    <View style={[styles.checkbox, active && styles.checkboxActive]}><Text style={styles.check}>{active ? '✓' : ''}</Text></View>
                    <Text style={styles.keywordText}>{keyword.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {/* AI 추천을 기본 선택하지 않는다. 최종 확정은 사용자가 한다. (PRD F-06) */}
            <AppButton label="키워드 선택 저장하기" disabled={!selected.length} onPress={submitKeywords} />
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({ content: { gap: 8 }, heading: { ...typography.h1, color: colors.text }, headingDescription: { ...typography.body, color: colors.textTertiary }, center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.md }, title: { ...typography.title, color: colors.text, textAlign: 'center' }, description: { ...typography.body, color: colors.textMuted, textAlign: 'center' }, modalRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }, dim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(18,29,45,0.18)' }, modalCard: { width: '100%', maxWidth: 360, gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow }, modalTitle: { ...typography.title, color: colors.text }, modalDescription: { ...typography.body, color: colors.textMuted }, keywords: { gap: 10 }, keyword: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 8 }, checkbox: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.textMuted, borderRadius: 4, backgroundColor: colors.surface }, checkboxActive: { borderColor: colors.primary, backgroundColor: colors.primary }, check: { color: colors.white, fontWeight: '700' }, keywordText: { ...typography.body, color: colors.text } });
