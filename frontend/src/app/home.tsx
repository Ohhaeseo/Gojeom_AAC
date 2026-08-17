import { BlurView } from 'expo-blur';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { VectorWordmark } from '@/components/brand/VectorWordmark';
import { OfficialFaceLogo } from '@/components/brand/OfficialLogos';
import { AppScreen } from '@/components/layout/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { formatAnalyzedDate } from '@/lib/date';
import { useAppState, type DrawerItem } from '@/state/AppState';
import { colors, radius, shadow, spacing, typography } from '@/theme/tokens';
import type { Category } from '@/types/api';

const label = { SKIN: '피부', BODY: '체형', HEALTH: '건강' } as const;
const metricsByCategory: Record<Category, { name: string; value: number }[]> = {
  SKIN: [{ name: '수분', value: 82 }, { name: '유분', value: 21 }, { name: '각질', value: 38 }, { name: '톤', value: 77 }],
  BODY: [{ name: '자세 균형', value: 74 }, { name: '활동량', value: 61 }, { name: '근육 균형', value: 68 }, { name: '유연성', value: 57 }],
  HEALTH: [{ name: '수면', value: 72 }, { name: '수분 섭취', value: 82 }, { name: '활동량', value: 64 }, { name: '회복', value: 76 }],
};
const metrics = metricsByCategory.SKIN;

export default function HomeScreen() {
  const { nickname, profile, priorities, photoUri, saved, tasks, result, loadDrawer, openSavedResult, routines, loadRoutines, openRoutine, activeRoutineId } = useAppState();
  const [selectedCategory, setSelectedCategory] = useState<Category>(priorities[0] ?? 'SKIN');
  useEffect(() => { const first = priorities[0]; if (first && !priorities.includes(selectedCategory)) setSelectedCategory(first); }, [priorities, selectedCategory]);
  const hasProfile = Boolean(profile);

  // `result`는 메모리에만 있어 새로고침하면 사라진다. 저장한 결과가 있는지는
  // **서버에 물어본다.** 그러지 않으면 서랍에 결과가 있는데도 "아직 없어요"라고
  // 말하게 된다. (오답 노트 N-12)
  const [latestSaved, setLatestSaved] = useState<DrawerItem>();
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    let alive = true;
    loadDrawer()
      .then((sections) => { if (alive) setLatestSaved(sections.recent[0] ?? sections.all[0]); })
      .catch(() => undefined);
    // 목표 목록도 같이 읽는다. 홈이 "어느 목표의 진행도인지" 말하려면 이름이 필요하고,
    // 태스크도 새로고침 후에는 비어 있다.
    void loadRoutines();
    return () => { alive = false; };
  }, [loadDrawer, loadRoutines]));

  // 새로고침 직후엔 태스크가 비어 있다. 보고 있던 목표를 서버에서 다시 올린다.
  const restoreTarget = routines.find((item) => item.routineId === activeRoutineId) ?? routines[0];
  useEffect(() => {
    if (!restoreTarget || tasks.length) return;
    void openRoutine(restoreTarget.routineId);
  }, [openRoutine, restoreTarget, tasks.length]);

  const activeRoutine = routines.find((item) => item.routineId === activeRoutineId) ?? restoreTarget;

  // 메모리에 올라온 결과가 우선이고, 없으면 서버가 준 최근 저장분을 쓴다.
  const recent = result
    ? { title: result.title, analyzedAt: result.analyzedAt, thumbnailUrl: result.comparisonImage.peakUrl, open: () => router.push('/analysis-result') }
    : latestSaved && {
      title: latestSaved.title,
      analyzedAt: latestSaved.analyzedAt,
      thumbnailUrl: latestSaved.thumbnailUrl,
      open: async () => {
        const outcome = await openSavedResult(latestSaved.savedResultId);
        if (!outcome.ok) return setError(outcome.message ?? '저장한 결과를 불러오지 못했어요.');
        router.push({ pathname: '/analysis-result', params: { source: 'drawer' } });
      },
    };
  const hasAnyProgress = Boolean(photoUri || priorities.length || saved);
  const done = tasks.filter((task) => task.status === 'DONE').length;
  const activeMetrics = metricsByCategory[selectedCategory];
  const goToMissingStep = () => {
    if (!photoUri) return router.push('/photo');
    if (priorities.length !== 3) return router.push('/priority');
    router.push('/body-info');
  };
  return (
    <AppScreen header={false} navigation contentStyle={styles.content}>
      <VectorWordmark width={82} height={37} />
      <Text style={styles.title}>안녕하세요, {nickname}님</Text><Text style={styles.sub}>오늘도 당신의 고점을 향해 GO!</Text>
      {hasProfile ? (
        <>
          <View accessibilityRole="tablist" style={styles.chips}>{priorities.map((item) => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: selectedCategory === item }} onPress={() => setSelectedCategory(item)} style={[styles.chip, selectedCategory !== item && styles.inactiveChip]}><Text style={styles.chipText}>{label[item]}</Text></Pressable>)}</View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>나의 현재 {label[selectedCategory]} 상태</Text>
            <View style={styles.dashboard}>
              <View style={styles.metricList}>{activeMetrics.map((item) => <View key={item.name}><View style={styles.metricHeader}><Text style={styles.metricName}>{item.name}</Text><Text style={styles.metricValue}>{item.value}%</Text></View><View style={styles.track}><View style={[styles.fill, { width: `${item.value}%` }, item.name === '유분' && styles.pointFill]} /></View></View>)}</View>
              <OfficialFaceLogo size={150} />
            </View>
            <AppButton label="새로 진단하기" onPress={() => router.push('/analysis-new')} />
            <Text style={styles.mockNote}>설정한 고점 기준 대비 참고용 프론트 시연 데이터입니다.</Text>
          </View>
          {/* 제목 끝의 〉가 "누를 수 있다"고 약속한다. 실제로 눌리게 한다. */}
          <Pressable accessibilityRole="button" accessibilityLabel="설정한 목표 진행도 보기" onPress={() => router.push('/routines')}><Text style={styles.sectionTitle}>설정한 목표 진행도 〉</Text></Pressable>
          {/*
            목표가 둘 이상일 수 있다 — 진단으로 만든 것과 진단 없이 만든 것(경로 B).
            **어느 목표의 진행도인지 밝히고, 여기서 바로 갈아탈 수 있게 한다.**
            누른 목표는 저장돼 루틴 화면과 새로고침 뒤에도 유지된다.
          */}
          {routines.length > 1 ? (
            <View accessibilityRole="tablist" style={styles.routineTabs}>
              {routines.map((item) => {
                const on = item.routineId === activeRoutine?.routineId;
                return (
                  <Pressable key={item.routineId} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => void openRoutine(item.routineId)} style={[styles.routineTab, on && styles.routineTabOn]}>
                    <Text style={[styles.routineTabText, on && styles.routineTabTextOn]} numberOfLines={1}>{item.category ? label[item.category] : '진단 기반'}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {activeRoutine ? <Text style={styles.routineName} numberOfLines={1}>{activeRoutine.title}</Text> : null}
          {/* 목표가 아직 없으면 "0/0 달성" 링이 그려진다. 분석만 끝난 상태와 목표를 만든 상태는 다르다. */}
          {tasks.length ? <Pressable onPress={() => router.push('/routines')} style={styles.progressCard}><GoalProgressRing completed={done} total={tasks.length} /><Text style={styles.progressText}>{tasks.slice(0, 3).map((task) => `${task.status === 'DONE' ? '✓ ' : ''}${task.title}`).join('\n')}</Text></Pressable> : <Pressable accessibilityRole="button" accessibilityLabel="목표 만들러 가기" onPress={() => router.push('/routines')} style={styles.emptyAnalysis}><Text style={styles.emptyTitle}>아직 설정한 목표가 없어요.</Text><Text style={styles.emptyText}>진단 결과로 만들거나, 진단 없이 바로 만들 수도 있어요.</Text></Pressable>}
          <Pressable accessibilityRole="button" accessibilityLabel="최근 분석 결과 보기" onPress={() => router.push('/drawer')}><Text style={styles.sectionTitle}>최근 분석 결과 〉</Text></Pressable>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {recent ? <Pressable accessibilityRole="button" accessibilityLabel={`${recent.title} 결과 보기`} onPress={recent.open} style={styles.resultCard}>{recent.thumbnailUrl ? <Image source={{ uri: recent.thumbnailUrl }} style={styles.thumb} accessibilityLabel={`${recent.title} 비교 이미지`} /> : <OfficialFaceLogo size={112} />}<View style={styles.resultCopy}><Text style={styles.date}>{formatAnalyzedDate(recent.analyzedAt)} 분석</Text><Text style={styles.resultTitle} numberOfLines={1}>{recent.title}</Text>{tasks.length ? <View style={styles.track}><View style={[styles.fill, { width: `${Math.round((done / tasks.length) * 100)}%` }]} /></View> : null}</View></Pressable> : <Pressable accessibilityRole="button" accessibilityLabel="서랍에서 저장한 결과 보기" onPress={() => router.push('/drawer')} style={styles.emptyAnalysis}><Text style={styles.emptyTitle}>아직 분석 결과가 없어요.</Text><Text style={styles.emptyText}>새로 진단을 완료하면 이곳에 결과가 표시돼요.{`\n`}저장한 결과는 서랍에서 볼 수 있어요.</Text></Pressable>}
        </>
      ) : (
        <View style={[styles.lockedArea, { borderRadius: radius.xl, overflow: 'hidden' }]}>
          <View pointerEvents="none" style={styles.previewContent}>
            <View style={styles.chips}><View style={styles.chip}><Text style={styles.chipText}>피부</Text></View><View style={[styles.chip, styles.inactiveChip]}><Text style={styles.chipText}>체형</Text></View><View style={[styles.chip, styles.inactiveChip]}><Text style={styles.chipText}>건강</Text></View></View>
            <View style={styles.card}><Text style={styles.cardTitle}>나의 현재 피부 상태</Text><View style={styles.dashboard}><View style={styles.metricList}>{metrics.map((item) => <View key={item.name}><View style={styles.metricHeader}><Text style={styles.metricName}>{item.name}</Text><Text style={styles.metricValue}>{item.value}%</Text></View><View style={styles.track}><View style={[styles.fill, { width: `${item.value}%` }]} /></View></View>)}</View><OfficialFaceLogo size={150} /></View></View>
            <Text style={styles.sectionTitle}>설정한 목표 진행도 〉</Text><View style={styles.progressCard}><GoalProgressRing completed={2} total={5} /><Text style={styles.progressText}>오늘의 루틴과 목표 진행 상황을 확인해보세요.</Text></View>
            <Text style={styles.sectionTitle}>최근 분석 결과 〉</Text><View style={styles.resultCard}><OfficialFaceLogo size={112} /><View style={styles.resultCopy}><Text style={styles.date}>최근 분석</Text><Text style={styles.resultTitle}>나만의 고점 분석 결과</Text></View></View>
          </View>
          <View style={styles.lockOverlay}>
            <BlurView intensity={18} tint="light" style={StyleSheet.absoluteFill} />
            <View style={styles.registrationModal}>
              <Text style={styles.emptyTitle}>{hasAnyProgress ? '프로필 준비 현황' : '아직 프로필이 없어요...'}</Text><Text style={styles.emptyText}>{hasAnyProgress ? '분석을 시작하려면 아래 정보를 완성해주세요.' : '여기를 눌러 맞춤형 분석이 담긴 프로필을 등록해 보세요.'}</Text>
              {hasAnyProgress ? <View style={styles.checkList}><CheckRow label="내 사진 등록하기" done={Boolean(photoUri)} /><CheckRow label="우선 순위 설정하기" done={priorities.length === 3} /><CheckRow label="신장, 체중 입력하기" done={Boolean(profile)} /><CheckRow label="고점 등록하기" done={saved} /></View> : null}
              <AppButton label={hasAnyProgress ? '부족한 정보 채우기' : '새로 진단하기'} onPress={goToMissingStep} />
            </View>
          </View>
        </View>
      )}
    </AppScreen>
  );
}

function GoalProgressRing({ completed, total }: { completed: number; total: number }) {
  const radiusValue = 42; const circumference = Math.PI * 2 * radiusValue; const progress = total ? completed / total : 0;
  const isComplete = total > 0 && completed === total;
  const progressColor = isComplete ? colors.primary : colors.danger;
  return <View style={styles.ringWrap}><Svg width={104} height={104} viewBox="0 0 104 104"><Circle cx={52} cy={52} r={radiusValue} fill={isComplete ? '#E1FAF2' : '#F7E8E9'} stroke={colors.disabled} strokeWidth={8} /><Circle cx={52} cy={52} r={radiusValue} fill="none" stroke={progressColor} strokeWidth={8} strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - progress)} transform="rotate(-90 52 52)" /><Path d="M31 51L46 64L73 37" fill="none" stroke={progressColor} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" /></Svg><Text style={[styles.ringCaption, { color: progressColor }]}>{completed}/{total} 달성</Text></View>;
}

function CheckRow({ label: text, done }: { label: string; done: boolean }) {
  return <View style={styles.checkRow}><View style={[styles.checkbox, done && styles.checkboxDone]}><Text style={styles.checkmark}>{done ? '✓' : ''}</Text></View><Text style={styles.checkLabel}>{text}</Text></View>;
}

const styles = StyleSheet.create({ content: { paddingTop: 28 }, title: { ...typography.h1, color: colors.text }, sub: { ...typography.body, color: colors.textMuted }, chips: { flexDirection: 'row', gap: 12 }, chip: { minWidth: 78, paddingVertical: 9, alignItems: 'center', borderRadius: radius.pill, backgroundColor: colors.primary }, inactiveChip: { backgroundColor: '#C8C9C9' }, chipText: { ...typography.label, color: colors.white }, card: { borderRadius: radius.lg, padding: spacing.md, backgroundColor: colors.surface, gap: spacing.md, ...shadow }, cardTitle: { ...typography.title, color: colors.text }, dashboard: { flexDirection: 'row', gap: spacing.md }, metricList: { flex: 1, gap: 9 }, metricHeader: { flexDirection: 'row', justifyContent: 'space-between' }, metricName: { ...typography.caption, color: colors.textMuted }, metricValue: { ...typography.caption, color: colors.textMuted }, track: { height: 10, borderRadius: 5, backgroundColor: colors.disabled, overflow: 'hidden' }, fill: { height: '100%', borderRadius: 5, backgroundColor: colors.primaryLight }, pointFill: { backgroundColor: colors.point }, face: { width: 150, height: 180, borderRadius: radius.md }, mockNote: { ...typography.caption, color: colors.textMuted, textAlign: 'center' }, sectionTitle: { ...typography.title, color: colors.text, marginTop: 4 }, progressCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surfaceSunken }, progressText: { flex: 1, ...typography.body, color: colors.textTertiary, lineHeight: 28 }, ringWrap: { width: 104, height: 126, alignItems: 'center', justifyContent: 'center' }, ringCaption: { ...typography.label, color: colors.danger, marginTop: -4 }, emptyAnalysis: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surfaceSunken }, resultCard: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primaryLight, backgroundColor: colors.surface, ...shadow }, thumb: { width: 112, height: 112, borderRadius: radius.md }, resultCopy: { flex: 1, justifyContent: 'center', gap: 8 }, date: { ...typography.caption, color: colors.textMuted }, resultTitle: { ...typography.label, color: colors.text }, lockedArea: { minHeight: 760, marginTop: spacing.sm, position: 'relative' }, previewContent: { gap: spacing.md }, lockOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md }, registrationModal: { width: '100%', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow }, emptyTitle: { ...typography.title, color: colors.text, textAlign: 'center' }, emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' }, errorText: { ...typography.caption, color: colors.danger }, routineTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -4 }, routineTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface }, routineTabOn: { borderColor: colors.primary, backgroundColor: colors.primary }, routineTabText: { ...typography.caption, color: colors.textMuted }, routineTabTextOn: { color: colors.white, fontWeight: '700' }, routineName: { ...typography.caption, color: colors.textMuted, marginTop: -4 }, checkList: { gap: 10, paddingVertical: 4 }, checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, checkbox: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 6, borderWidth: 1, borderColor: colors.disabled, backgroundColor: colors.surface }, checkboxDone: { borderColor: colors.primary, backgroundColor: colors.primary }, checkmark: { color: colors.white, fontSize: 14, fontWeight: '700' }, checkLabel: { ...typography.body, color: colors.text } });
