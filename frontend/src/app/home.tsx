import { BlurView } from 'expo-blur';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { VectorWordmark } from '@/components/brand/VectorWordmark';
import { OfficialFaceLogo } from '@/components/brand/OfficialLogos';
import { AppScreen } from '@/components/layout/AppScreen';
import { ProductRecommendation } from '@/components/product/ProductRecommendation';
import { ProductShelf } from '@/components/product/ProductShelf';
import { AppButton } from '@/components/ui/AppButton';
import { formatAnalyzedDate } from '@/lib/date';
import { groupByTiming, todayTasks, weeklyProgress } from '@/lib/tasks';
import { useAppState, type DrawerItem } from '@/state/AppState';
import { colors, fonts, radius, shadow, spacing, typography } from '@/theme/tokens';
import type { AnalysisResult, Category } from '@/types/api';

const label = { SKIN: '피부', BODY: '체형', HEALTH: '건강' } as const;

/**
 * 잠금 미리보기에만 쓰는 예시 문구. 프로필이 없어 **읽어올 결과 자체가 없는**
 * 상태에서 카드 모양만 보여준다. 실제 카드는 서버가 준 `categoryChanges`를 쓴다.
 */
const previewChange = '수분 섭취와 균일한 피부 표현을 중심으로 관리해보세요.';

export default function HomeScreen() {
  const { nickname, profile, priorities, photoUri, saved, tasks, toggleTask, result, loadDrawer, openSavedResult, peekSavedResult, routines, loadRoutines, openRoutines, activeRoutineIds } = useAppState();
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

  // 새로고침 직후엔 태스크가 비어 있다. 보고 있던 목표들을 서버에서 다시 올린다.
  const known = routines.filter((item) => activeRoutineIds.includes(item.routineId));
  const restoreIds = (known.length ? known : routines.slice(0, 1)).map((item) => item.routineId);
  // 배열 리터럴은 매번 새 참조라 그대로 의존성에 넣으면 effect가 끝없이 돈다.
  const restoreKey = restoreIds.join(',');
  useEffect(() => {
    if (!restoreKey || tasks.length) return;
    void openRoutines(restoreKey.split(','));
  }, [openRoutines, restoreKey, tasks.length]);

  const selectedRoutines = routines.filter((item) => restoreIds.includes(item.routineId));

  /**
   * 탭을 눌러 목표를 넣고 뺀다. **마지막 하나는 빼지 않는다** — 전부 꺼두면
   * 오늘 할 일이 빈 화면이 되고, 사용자는 무엇을 잘못했는지 알 수 없다.
   */
  const toggleRoutine = (id: string) => {
    const next = activeRoutineIds.includes(id)
      ? activeRoutineIds.filter((value) => value !== id)
      : [...activeRoutineIds, id];
    if (!next.length) return;
    void openRoutines(next);
  };

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

  /**
   * 진행률 링이 무엇을 세는지. **기본은 오늘이다.**
   *
   * V15로 일정이 날짜마다 펼쳐지면서 전체 합이 네 자리가 됐다(6개월 목표면 1,000을
   * 넘는다). `5/1176`은 **오늘 다섯 개를 해낸 사람에게 아직 1,171개 남았다고 말하는
   * 숫자**라, 링이 격려가 아니라 부담이 된다. 전체는 눌러서 볼 수 있게만 둔다.
   */
  const [scope, setScope] = useState<'TODAY' | 'ALL'>('TODAY');

  // `변화 방향`은 결과 안에만 있고 서랍 목록에는 없다. 메모리의 `result`가
  // 우선이고, 새로고침으로 비었으면 최근 저장분을 **읽기만** 해서 채운다.
  // `openSavedResult`를 쓰면 보고 있던 목표가 풀린다. (오답 노트 N-12)
  const [savedChanges, setSavedChanges] = useState<AnalysisResult['categoryChanges']>();
  const fallbackId = result ? undefined : latestSaved?.savedResultId;
  useEffect(() => {
    if (!fallbackId) return;
    let alive = true;
    void peekSavedResult(fallbackId).then((full) => { if (alive) setSavedChanges(full?.categoryChanges); });
    return () => { alive = false; };
  }, [fallbackId, peekSavedResult]);
  const changes = result?.categoryChanges ?? savedChanges;
  const activeChange = changes?.find((item) => item.category === selectedCategory);
  // 루틴 화면과 **같은 함수**로 고르고 정렬한다. 각자 하면 순서가 갈린다.
  const today = todayTasks(tasks).items;
  /*
    추천의 근거. 피부 카테고리의 변화 방향 문장과 **사용자가 고른 키워드**를 잇는다.
    분석을 하지 않았으면 빈 문자열이고, 그때 추천 블록은 그려지지 않는다.
  */
  const recommendBasis = [
    changes?.find((item) => item.category === 'SKIN')?.description ?? '',
    ...(result?.overview.keywords.filter((keyword) => keyword.selected).map((keyword) => keyword.label) ?? []),
  ].join(' ').trim();

  const todayDone = today.filter((task) => task.status === 'DONE').length;
  const groups = groupByTiming(today);
  // 미리보기도 **목록과 같은 순서**여야 한다. 정렬만 다르면 위 카드와 아래 목록의
  // 첫 줄이 달라 보여 같은 것을 말하는지 헷갈린다.
  const ordered = groups.flatMap((group) => group.items);
  // 하나만 골랐으면 이름을 줄마다 되풀이할 이유가 없다.
  const titleOf = (id?: string) => (selectedRoutines.length > 1
    ? routines.find((item) => item.routineId === id)?.title
    : undefined);
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
                const on = activeRoutineIds.includes(item.routineId);
                return (
                  // 라벨은 **루틴 이름**이다. 카테고리를 쓰면 같은 카테고리 목표가
                  // 둘일 때 `체형`이 두 개 나와 무엇을 고르는지 알 수 없다.
                  <Pressable key={item.routineId} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => toggleRoutine(item.routineId)} style={[styles.routineTab, on && styles.routineTabOn]}>
                    <Text style={[styles.routineTabText, on && styles.routineTabTextOn]} numberOfLines={1}>{item.title}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {selectedRoutines.length ? <Text style={styles.routineName} numberOfLines={1}>{selectedRoutines.map((item) => item.title).join(' · ')}</Text> : null}
          {/* 목표가 아직 없으면 "0/0 달성" 링이 그려진다. 분석만 끝난 상태와 목표를 만든 상태는 다르다. */}
          {tasks.length ? (
            <View style={styles.progressCard}>
              {/*
                **링이 무엇을 세는지 고른다.** 카드 안 왼쪽 위지만, 화면 이동을 맡는
                Pressable(아래 몸통)의 **형제**다 — 안에 넣으면 토글을 누를 때 루틴
                화면이 같이 열린다. (N-11)
              */}
              <View accessibilityRole="tablist" style={styles.scopeTabs}>
                {([['TODAY', '오늘'], ['ALL', '전체']] as const).map(([key, label]) => (
                  <Pressable
                    key={key}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: scope === key }}
                    accessibilityLabel={`${label} 진행도 보기`}
                    onPress={() => setScope(key)}
                    style={[styles.scopeTab, scope === key && styles.scopeTabOn]}
                  >
                    <Text style={[styles.scopeTabText, scope === key && styles.scopeTabTextOn]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="루틴 화면으로 이동" onPress={() => router.push('/routines')} style={styles.progressBody}>
                <GoalProgressRing completed={scope === 'TODAY' ? todayDone : done} total={scope === 'TODAY' ? today.length : tasks.length} />
                <Text style={styles.progressText}>{ordered.slice(0, 3).map((task) => `${task.status === 'DONE' ? '✓ ' : ''}${task.title}`).join('\n')}</Text>
              </Pressable>
            </View>
          ) : <Pressable accessibilityRole="button" accessibilityLabel="목표 만들러 가기" onPress={() => router.push('/routines')} style={styles.emptyAnalysis}><Text style={styles.emptyTitle}>아직 설정한 목표가 없어요.</Text><Text style={styles.emptyText}>진단 결과로 만들거나, 진단 없이 바로 만들 수도 있어요.</Text></Pressable>}

          {/*
            **홈에서 바로 체크한다.** 오늘 할 일을 보려고 루틴 화면까지 들어갔다
            나오게 하지 않는다. 목록·정렬 규칙은 루틴 화면과 같은 함수를 쓴다 —
            두 화면이 다른 순서로 같은 태스크를 보여주면 안 된다.
          */}
          {today.length ? (
            <View style={styles.todayCard}>
              {/*
                **오늘 기준으로 센다.** `tasks`에는 기간만큼 복제된 회차가 전부
                들어 있어(6개월이면 24회차) `0/48`처럼 나온다. 홈에서 궁금한 것은
                오늘 몇 개를 했느냐지 목표 전체 태스크 수가 아니다.
              */}
              <Text style={styles.todayHead}>오늘 할 일 <Text style={styles.todayCount}>{todayDone}/{today.length}</Text></Text>
              {groups.map((group) => (
                <View key={group.key}>
                  {/*
                    시점으로 나눈다. 그냥 나열하면 아침에 할 일과 자기 전에 할 일이
                    한 덩어리라 "지금 뭘 해야 하는지"를 눈으로 골라내야 한다.
                  */}
                  <Text style={styles.groupLabel}>{group.label}</Text>
                  {group.items.map((task) => (
                <Pressable key={task.taskId} accessibilityRole="checkbox" accessibilityState={{ checked: task.status === 'DONE' }} accessibilityLabel={task.title} onPress={() => toggleTask(task.taskId)} style={styles.todayRow}>
                  <View style={[styles.todayBox, task.status === 'DONE' && styles.todayBoxOn]}><Text style={styles.todayCheck}>{task.status === 'DONE' ? '✓' : ''}</Text></View>
                  <View style={styles.todayCopy}>
                    <Text style={[styles.todayTitle, task.status === 'DONE' && styles.todayDone]} numberOfLines={1}>{task.title}</Text>
                    {/*
                      목표를 여럿 골랐으면 **어느 목표의 일인지 밝힌다.** 시점 순으로
                      섞여 나열되므로 이름이 없으면 무엇 때문에 하는 일인지 알 수 없다.
                    */}
                    <Text style={styles.todayMeta}>{[titleOf(task.routineId), task.timing, task.amountLabel].filter(Boolean).join(' · ')}</Text>
                    {/*
                      주 N회는 그 주의 모든 날에 뜬다. 이 줄이 없으면 사용자가
                      **매일 해야 하는 일로 읽는다.** 캘린더와 같은 함수를 쓴다. (V15)
                    */}
                    {(() => {
                      const week = weeklyProgress(task, tasks);
                      return week ? (
                        <Text style={[styles.todayWeekly, week.done >= week.target && styles.todayWeeklyDone]}>
                          이번 주 {week.done}/{week.target}{week.done >= week.target ? ' · 다 했어요' : ''}
                        </Text>
                      ) : null;
                    })()}
                  </View>
                </Pressable>
                  ))}
                </View>
              ))}
            </View>
          ) : null}

          <Pressable accessibilityRole="button" accessibilityLabel="최근 분석 결과 보기" onPress={() => router.push('/drawer')}><Text style={styles.sectionTitle}>최근 분석 결과 〉</Text></Pressable>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {recent ? <Pressable accessibilityRole="button" accessibilityLabel={`${recent.title} 결과 보기`} onPress={recent.open} style={styles.resultCard}>{recent.thumbnailUrl ? <Image source={{ uri: recent.thumbnailUrl }} style={styles.thumb} accessibilityLabel={`${recent.title} 비교 이미지`} /> : <OfficialFaceLogo size={112} />}<View style={styles.resultCopy}><Text style={styles.date}>{formatAnalyzedDate(recent.analyzedAt)} 분석</Text><Text style={styles.resultTitle} numberOfLines={1}>{recent.title}</Text>{tasks.length ? <View style={styles.track}><View style={[styles.fill, { width: `${Math.round((done / tasks.length) * 100)}%` }]} /></View> : null}</View></Pressable> : <Pressable accessibilityRole="button" accessibilityLabel="서랍에서 저장한 결과 보기" onPress={() => router.push('/drawer')} style={styles.emptyAnalysis}><Text style={styles.emptyTitle}>아직 분석 결과가 없어요.</Text><Text style={styles.emptyText}>새로 진단을 완료하면 이곳에 결과가 표시돼요.{`\n`}저장한 결과는 서랍에서 볼 수 있어요.</Text></Pressable>}

          {/*
            나의 현재 상태를 **목표 진행도 아래로 내렸다.** 매일 여는 화면에서 먼저
            보여야 하는 것은 오늘 할 일이지 상태 요약이 아니다.

            퍼센트 막대(`수분 82%`)를 걷어내고 **서버가 준 변화 방향**으로 바꿨다.
            채울 API가 없어서가 아니라 **만들면 안 되는 UI**였다 — API.md §6.4는
            `changeIntensity`를 텍스트로 정하며 "퍼센트 게이지 UI를 만들지 않는다"고
            적고 있고, 카테고리별 점수를 지어내면 PRD G-3(진단 표현 금지)과
            `OutputValidator.SCORE`가 막는 것을 화면이 대신 하는 꼴이 된다.
          */}
          <View accessibilityRole="tablist" style={styles.chips}>{priorities.map((item) => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: selectedCategory === item }} onPress={() => setSelectedCategory(item)} style={[styles.chip, selectedCategory !== item && styles.inactiveChip]}><Text style={styles.chipText}>{label[item]}</Text></Pressable>)}</View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>나의 현재 {label[selectedCategory]} 상태</Text>
            <View style={styles.dashboard}>
              <Text style={styles.changeText}>{activeChange?.description ?? '진단을 완료하면 이 카테고리의 관리 방향을 알려드려요.'}</Text>
              <OfficialFaceLogo size={150} />
            </View>
            <AppButton label="새로 진단하기" onPress={() => router.push('/analysis-new')} />
          </View>

          {/*
            **분석 결과를 근거로 한 추천이 먼저, 전체 진열이 그 아래다.** 결과가
            없으면 추천 블록은 스스로 아무것도 그리지 않는다 — 근거 없이 "당신을
            위한 추천"이라고 말하지 않는다.
          */}
          <ProductRecommendation basis={recommendBasis} resultId={result?.resultId ?? latestSaved?.resultId} />
          <ProductShelf />
        </>
      ) : (
        <View style={[styles.lockedArea, { borderRadius: radius.xl, overflow: 'hidden' }]}>
          <View pointerEvents="none" style={styles.previewContent}>
            <View style={styles.chips}><View style={styles.chip}><Text style={styles.chipText}>피부</Text></View><View style={[styles.chip, styles.inactiveChip]}><Text style={styles.chipText}>체형</Text></View><View style={[styles.chip, styles.inactiveChip]}><Text style={styles.chipText}>건강</Text></View></View>
            <View style={styles.card}><Text style={styles.cardTitle}>나의 현재 피부 상태</Text><View style={styles.dashboard}><Text style={styles.changeText}>{previewChange}</Text><OfficialFaceLogo size={150} /></View></View>
            <Text style={styles.sectionTitle}>설정한 목표 진행도 〉</Text><View style={styles.progressCard}><View style={styles.progressBody}><GoalProgressRing completed={2} total={5} /><Text style={styles.progressText}>오늘의 루틴과 목표 진행 상황을 확인해보세요.</Text></View></View>
            <Text style={styles.sectionTitle}>최근 분석 결과 〉</Text><View style={styles.resultCard}><OfficialFaceLogo size={112} /><View style={styles.resultCopy}><Text style={styles.date}>최근 분석</Text><Text style={styles.resultTitle}>나만의 고점 분석 결과</Text></View></View>
          </View>
          <View style={styles.lockOverlay}>
            <BlurView intensity={18} tint="light" style={StyleSheet.absoluteFill} />
            <View style={styles.registrationModal}>
              <Text style={styles.emptyTitle}>{hasAnyProgress ? '프로필 준비 현황' : '아직 프로필이 없어요...'}</Text><Text style={styles.emptyText}>{hasAnyProgress ? '분석을 시작하려면 아래 정보를 완성해주세요.' : '여기를 눌러 맞춤형 분석이 담긴 프로필을 등록해 보세요.'}</Text>
              {hasAnyProgress ? <View style={styles.checkList}><CheckRow label="내 사진 등록하기" done={Boolean(photoUri)} /><CheckRow label="우선 순위 설정하기" done={priorities.length === 3} /><CheckRow label="신장, 체중 입력하기" done={Boolean(profile)} /><CheckRow label="고점 등록하기" done={saved} /></View> : null}
              <AppButton label={hasAnyProgress ? '부족한 정보 채우기' : '프로필 만들기'} onPress={goToMissingStep} />
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

const styles = StyleSheet.create({ content: { paddingTop: 28 }, title: { ...typography.h1, color: colors.text }, sub: { ...typography.body, color: colors.textMuted }, chips: { flexDirection: 'row', gap: 12 }, chip: { minWidth: 78, paddingVertical: 9, alignItems: 'center', borderRadius: radius.pill, backgroundColor: colors.primary }, inactiveChip: { backgroundColor: '#C8C9C9' }, chipText: { ...typography.label, color: colors.white }, card: { borderRadius: radius.lg, padding: spacing.md, backgroundColor: colors.surface, gap: spacing.md, ...shadow }, cardTitle: { ...typography.title, color: colors.text }, dashboard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, changeText: { flex: 1, ...typography.body, color: colors.textTertiary, lineHeight: 26 }, track: { height: 10, borderRadius: 5, backgroundColor: colors.disabled, overflow: 'hidden' }, fill: { height: '100%', borderRadius: 5, backgroundColor: colors.primaryLight }, face: { width: 150, height: 180, borderRadius: radius.md }, sectionTitle: { ...typography.title, color: colors.text, marginTop: 4 }, scopeTabs: { flexDirection: 'row', gap: 6, alignSelf: 'flex-start' }, scopeTab: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface }, scopeTabOn: { borderColor: colors.primary, backgroundColor: colors.primary }, scopeTabText: { ...typography.caption, color: colors.textMuted }, scopeTabTextOn: { color: colors.white, fontWeight: '700' }, progressCard: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surfaceSunken }, progressBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg }, progressText: { flex: 1, ...typography.body, color: colors.textTertiary, lineHeight: 28 }, ringWrap: { width: 104, height: 126, alignItems: 'center', justifyContent: 'center' }, ringCaption: { ...typography.label, color: colors.danger, marginTop: -4 }, emptyAnalysis: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surfaceSunken }, resultCard: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primaryLight, backgroundColor: colors.surface, ...shadow }, thumb: { width: 112, height: 112, borderRadius: radius.md }, resultCopy: { flex: 1, justifyContent: 'center', gap: 8 }, date: { ...typography.caption, color: colors.textMuted }, resultTitle: { ...typography.label, color: colors.text }, lockedArea: { minHeight: 760, marginTop: spacing.sm, position: 'relative' }, previewContent: { gap: spacing.md }, lockOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md }, registrationModal: { width: '100%', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow }, emptyTitle: { ...typography.title, color: colors.text, textAlign: 'center' }, emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' }, errorText: { ...typography.caption, color: colors.danger }, routineTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -4 }, routineTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface }, routineTabOn: { borderColor: colors.primary, backgroundColor: colors.primary }, routineTabText: { ...typography.caption, color: colors.textMuted }, routineTabTextOn: { color: colors.white, fontWeight: '700' }, routineName: { ...typography.caption, color: colors.textMuted, marginTop: -4 }, checkList: { gap: 10, paddingVertical: 4 }, checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, checkbox: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 6, borderWidth: 1, borderColor: colors.disabled, backgroundColor: colors.surface }, checkboxDone: { borderColor: colors.primary, backgroundColor: colors.primary }, checkmark: { color: colors.white, fontSize: 14, fontWeight: '700' }, checkLabel: { ...typography.body, color: colors.text }, todayCard: { gap: 2, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow }, todayHead: { ...typography.label, color: colors.text, marginBottom: 6 }, groupLabel: { ...typography.caption, fontFamily: fonts.semibold, fontWeight: '700', fontSize: 13, color: colors.text, marginTop: 14, marginBottom: 2 }, todayCount: { color: colors.primary }, todayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 }, todayBox: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 6, borderWidth: 1, borderColor: colors.disabled, backgroundColor: colors.surface }, todayBoxOn: { borderColor: colors.primary, backgroundColor: colors.primary }, todayCheck: { color: colors.white, fontSize: 13, fontWeight: '700' }, todayCopy: { flex: 1, gap: 2 }, todayTitle: { ...typography.body, color: colors.text }, todayDone: { color: colors.textMuted, textDecorationLine: 'line-through' }, todayMeta: { ...typography.caption, color: colors.textTertiary }, todayWeekly: { ...typography.caption, color: colors.primaryPressed }, todayWeeklyDone: { color: colors.textMuted } });
