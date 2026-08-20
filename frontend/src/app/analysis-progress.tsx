import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';

import { AnalysisLogo } from '@/components/brand/AnalysisLogo';
import { AnalysisPanel } from '@/components/analysis/AnalysisPanel';
import { ProgressGauge } from '@/components/analysis/ProgressGauge';
import { Icon } from '@/components/ui/Icon';
import { AppScreen } from '@/components/layout/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { SubscribeModal } from '@/components/subscription/SubscribeModal';
import { useAppState } from '@/state/AppState';
import { colors, radius, shadow, spacing, typography } from '@/theme/tokens';

/** 키워드는 1~4개까지 고를 수 있다. (API.md §6.4 · PRD F-06) */
const MAX_SELECT = 4;

type Phase = 'extracting' | 'keywords' | 'generating' | 'done' | 'failed';

export default function AnalysisProgressScreen() {
  const params = useLocalSearchParams<{ input?: string; images?: string }>();
  const {
    startAnalysis, resumeAnalysis, discardAnalysis,
    confirmKeywords, analysisKeywords, analysisStatusText, analysisPercent, mode,
  } = useAppState();

  const [phase, setPhase] = useState<Phase>('extracting');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  /** 분석권이 없어 막힌 상태. 실패와 구분해야 구독 안내를 띄울 수 있다. */
  const [needsPlan, setNeedsPlan] = useState(false);
  /*
    🔴 **끝내지 못한 분석이 남아 있는 상태.**

    키워드를 고르다 화면을 벗어나면 그 분석이 `KEYWORDS_READY`로 남고, 서버는
    사용자당 진행 중 분석을 하나로 묶어 두어 **이후 모든 분석이 409로 막힌다.**
    예전에는 화면이 이 코드를 몰라 "분석을 시작하지 못했어요"만 띄웠고,
    사용자에게는 **빠져나갈 길이 없었다.**
  */
  const [pendingId, setPendingId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const started = useRef(false);

  const inputText = params.input ?? '';
  const imageUris = (() => {
    try { return params.images ? (JSON.parse(params.images) as string[]) : []; } catch { return []; }
  })();

  const run = useCallback(async () => {
    setError('');
    setNeedsPlan(false);
    setPendingId(undefined);
    setPhase('extracting');
    const result = await startAnalysis(inputText, imageUris);
    if (result.ok) { setPhase('keywords'); return; }
    // 분석권 소진은 "실패"가 아니라 구독하면 풀리는 상태다. 두 번째 분석에서 여기 온다.
    if (result.code === 'NO_ANALYSIS_CREDIT') { setNeedsPlan(true); setPhase('failed'); return; }
    // 끝내지 못한 분석이 막고 있는 것도 실패가 아니다. 어떻게 할지 물어본다.
    if (result.pendingAnalysisId) { setPendingId(result.pendingAnalysisId); setPhase('failed'); return; }
    setError(result.message ?? '분석을 시작하지 못했어요.');
    setPhase('failed');
  }, [imageUris, inputText, startAnalysis]);

  /** 남아 있던 분석을 이어서 진행한다. 어느 화면으로 갈지는 그 분석의 상태가 정한다. */
  const resume = useCallback(async () => {
    if (!pendingId || busy) return;
    setBusy(true); setError(''); setPhase('extracting');
    const outcome = await resumeAnalysis(pendingId);
    setBusy(false);
    if (!outcome.ok) { setError(outcome.message ?? '이전 분석을 이어가지 못했어요.'); setPhase('failed'); return; }
    setPendingId(undefined);
    setPhase(outcome.phase === 'done' ? 'done' : 'keywords');
  }, [busy, pendingId, resumeAnalysis]);

  /** 남아 있던 분석을 버리고, 방금 입력한 내용으로 새로 시작한다. */
  const discard = useCallback(async () => {
    if (!pendingId || busy) return;
    setBusy(true); setError('');
    const outcome = await discardAnalysis(pendingId);
    setBusy(false);
    if (!outcome.ok) return setError(outcome.message ?? '이전 분석을 버리지 못했어요.');
    setPendingId(undefined);
    void run();
  }, [busy, discardAnalysis, pendingId, run]);

  // 키워드 추출까지 진행한다. StrictMode의 이중 실행을 ref로 막는다.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

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

  const statusTitle = pendingId ? '아직 끝나지 않은 분석이 있어요'
    : needsPlan ? '분석권을 모두 사용했어요'
    : failed ? '분석에 실패했어요'
    : completed ? '분석 완료!'
    : phase === 'generating' ? '분석 중...'
    : '키워드 추출 중...';

  const statusDescription = pendingId
    ? (error || '먼저 하던 분석을 이어서 끝내거나, 버리고 새로 시작할 수 있어요.\n버려도 분석권은 줄지 않아요.')
    : needsPlan ? '구독하면 고점 분석을 횟수 제한 없이 이용할 수 있어요.'
    : failed ? error
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
          {completed ? <AppButton label="바로 결과 확인하기" onPress={() => router.replace('/analysis-result')} /> : null}
          {failed && needsPlan ? <AppButton label="구독하고 계속하기" onPress={() => setPlanOpen(true)} /> : null}
          {/* 막다른 길을 만들지 않는다 — 어느 쪽을 골라도 분석을 계속할 수 있다. */}
          {failed && pendingId ? <AppButton label={busy ? '이어가는 중...' : '이어서 하기'} disabled={busy} onPress={resume} /> : null}
          {failed && pendingId ? <AppButton label={busy ? '정리하는 중...' : '버리고 새로 시작'} variant="secondary" disabled={busy} onPress={discard} /> : null}
          {failed && !needsPlan && !pendingId ? <AppButton label="다시 시도하기" onPress={() => router.replace('/analysis-new')} /> : null}
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
                    <View style={[styles.checkbox, active && styles.checkboxActive]}>{active ? <Icon name="check" size={13} color={colors.white} /> : null}</View>
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
      <SubscribeModal
        visible={planOpen}
        onClose={() => setPlanOpen(false)}
        onSubscribed={() => { setPlanOpen(false); void run(); }}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({ content: { gap: 8 }, heading: { ...typography.h1, color: colors.text }, headingDescription: { ...typography.body, color: colors.textTertiary }, center: { flexGrow: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md }, title: { ...typography.title, color: colors.text, textAlign: 'center' }, description: { ...typography.body, color: colors.textMuted, textAlign: 'center' }, modalRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }, dim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(18,29,45,0.18)' }, modalCard: { width: '100%', maxWidth: 360, gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow }, modalTitle: { ...typography.title, color: colors.text }, modalDescription: { ...typography.body, color: colors.textMuted }, keywords: { gap: 10 }, keyword: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 8 }, checkbox: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.textMuted, borderRadius: 4, backgroundColor: colors.surface }, checkboxActive: { borderColor: colors.primary, backgroundColor: colors.primary }, check: { color: colors.white, fontWeight: '700' }, keywordText: { ...typography.body, color: colors.text } });
