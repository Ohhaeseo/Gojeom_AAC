import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/layout/AppScreen';
import { OfficialFaceLogo } from '@/components/brand/OfficialLogos';
import { GoModal } from '@/components/ui/GoModal';
import { formatAnalyzedDate } from '@/lib/date';
import { useAppState, type DrawerItem, type DrawerSections } from '@/state/AppState';
import { colors, radius, shadow, spacing, typography } from '@/theme/tokens';

/**
 * 서랍 — 저장한 고점 분석 결과. (시안 19 · API.md §6.5)
 *
 * 서버가 `inProgress` · `recent` · `all` 세 섹션을 한 번에 내려준다. 섹션을 프론트가
 * 다시 나누지 않는다. 판정 기준(진행 중 목표 연결 · 1개월 이내)이 서버에 있다.
 */
export default function DrawerScreen() {
  const { loadDrawer, openSavedResult, deleteSavedResult } = useAppState();
  const [sections, setSections] = useState<DrawerSections>();
  const [error, setError] = useState('');
  const [target, setTarget] = useState<DrawerItem>();
  const [pending, setPending] = useState(false);

  // 결과를 저장하고 돌아오면 목록이 달라져 있다. 화면에 들어올 때마다 다시 읽는다.
  useFocusEffect(useCallback(() => {
    let alive = true;
    setError('');
    loadDrawer()
      .then((loaded) => { if (alive) setSections(loaded); })
      .catch(() => { if (alive) setError('서랍을 불러오지 못했어요. 잠시 후 다시 시도해주세요.'); });
    return () => { alive = false; };
  }, [loadDrawer]));

  const open = async (item: DrawerItem) => {
    const outcome = await openSavedResult(item.savedResultId);
    if (!outcome.ok) return setError(outcome.message ?? '저장한 결과를 불러오지 못했어요.');
    router.push({ pathname: '/analysis-result', params: { source: 'drawer' } });
  };

  const remove = async () => {
    if (!target) return;
    setPending(true);
    const outcome = await deleteSavedResult(target.savedResultId);
    setPending(false);
    setTarget(undefined);
    if (!outcome.ok) return setError(outcome.message ?? '서랍에서 지우지 못했어요.');
    // 목록을 다시 읽는다. 지운 항목이 세 섹션 중 어디에 있었는지 프론트가 계산하지 않는다.
    setSections(await loadDrawer().catch(() => undefined));
  };

  if (!sections) return <AppScreen navigation contentStyle={styles.content}>{error ? <Text style={styles.errorText}>{error}</Text> : <ActivityIndicator color={colors.primary} style={styles.loading} />}</AppScreen>;

  return (
    <AppScreen navigation contentStyle={styles.content}>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Text style={styles.title}>현재 진행중인 목표</Text><Text style={styles.description}>목표로 생성되어 진행 중인 분석을 보여줘요.</Text>
      <Section items={sections.inProgress} onOpen={open} emptyTitle="아직 진행중인 목표가 없어요..." emptyBody={`여기를 눌러 최근 분석 결과 중에서\n목표를 생성할 수 있어요.`} onEmptyPress={() => router.push('/goal')} />
      <Text style={styles.title}>최근 분석 결과</Text><Text style={styles.description}>한달 내 저장한 고점 분석 결과를 확인할 수 있어요.</Text>
      <Section items={sections.recent} onOpen={open} emptyTitle="아직 분석 결과가 없어요." emptyBody="새로 진단을 완료하면 이곳에 결과가 표시돼요." />
      <Text style={styles.title}>전체</Text><Text style={styles.description}>그동안 분석한 목표를 전부 볼 수 있어요.</Text>
      <Section items={sections.all} onOpen={open} onRemove={setTarget} emptyTitle="아직 분석 결과가 없어요." emptyBody="새로 진단을 완료하면 이곳에 결과가 표시돼요." />
      {/* 삭제는 '전체'에서만 받는다. 같은 결과가 세 섹션에 겹쳐 보이므로 지우는 자리를 하나로 둔다. */}
      <GoModal visible={Boolean(target)} destructive title="서랍에서 지울까요?" description={`${target?.title ?? ''}\n지운 결과는 되돌릴 수 없어요. 목표는 그대로 남아요.`} confirmLabel={pending ? '삭제 중...' : '삭제하기'} confirmDisabled={pending} onClose={() => setTarget(undefined)} onConfirm={remove} />
    </AppScreen>
  );
}

function Section({ items, onOpen, onRemove, emptyTitle, emptyBody, onEmptyPress }: { items: DrawerItem[]; onOpen: (item: DrawerItem) => void; onRemove?: (item: DrawerItem) => void; emptyTitle: string; emptyBody: string; onEmptyPress?: () => void }) {
  if (!items.length) return <Pressable onPress={onEmptyPress} disabled={!onEmptyPress} style={styles.empty}><Text style={styles.emptyTitle}>{emptyTitle}</Text><Text style={styles.body}>{emptyBody}</Text></Pressable>;
  return <>{items.map((item) => <ResultCard key={item.savedResultId} item={item} onPress={() => onOpen(item)} onRemove={onRemove && (() => onRemove(item))} />)}</>;
}

function ResultCard({ item, onPress, onRemove }: { item: DrawerItem; onPress: () => void; onRemove?: () => void }) {
  return (
    <View style={styles.cardWrap}>
    <Pressable onPress={onPress} style={styles.card}>
      {/* 이미지가 없는 결과(SKIPPED·FAILED)는 브랜드 로고를 세운다. (API.md §6.5) */}
      {item.thumbnailUrl ? <Image source={{ uri: item.thumbnailUrl }} style={styles.image} accessibilityLabel={`${item.title} 비교 이미지`} /> : <OfficialFaceLogo size={104} />}
      <View style={styles.copy}>
        <Text style={styles.date}>{formatAnalyzedDate(item.analyzedAt)} 분석</Text>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        {/* 목표가 없으면 진행률 자체가 없다. 0%로 그리면 "시작했는데 안 했다"로 읽힌다. */}
        {item.progressRate == null ? <Text style={styles.date}>목표를 만들면 진행률이 표시돼요</Text> : <><Text style={styles.date}>고점 달성 진행률 {Math.round(item.progressRate)}%</Text><View style={styles.track}><View style={[styles.fill, { width: `${Math.min(100, Math.max(0, item.progressRate))}%` }]} /></View></>}
      </View>
      <Text style={styles.arrow}>›</Text>
    </Pressable>
    {/* 카드 Pressable 밖에 둔다. 안에 두면 삭제를 누를 때 결과가 함께 열린다. */}
    {onRemove ? <Pressable accessibilityRole="button" accessibilityLabel={`${item.title} 서랍에서 삭제`} hitSlop={8} onPress={onRemove} style={styles.removeBtn}><Text style={styles.removeText}>×</Text></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({ content: { gap: spacing.md }, loading: { marginTop: spacing.xl }, cardWrap: { position: 'relative' }, removeBtn: { position: 'absolute', top: -6, right: -6, width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 13, borderWidth: 1, borderColor: colors.point, backgroundColor: colors.white }, removeText: { fontSize: 17, lineHeight: 19, color: colors.danger }, title: { ...typography.h1, color: colors.text, marginTop: spacing.sm }, description: { ...typography.body, color: colors.textMuted }, card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primaryLight, backgroundColor: colors.surface, ...shadow }, image: { width: 104, height: 104, borderRadius: radius.md, backgroundColor: '#DFFFF4' }, copy: { flex: 1, justifyContent: 'center', gap: 7 }, date: { ...typography.caption, color: colors.textMuted }, cardTitle: { ...typography.label, color: colors.text }, body: { ...typography.body, color: colors.textTertiary, textAlign: 'center' }, empty: { minHeight: 145, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow }, emptyTitle: { ...typography.title, color: colors.text }, track: { height: 14, overflow: 'hidden', borderRadius: 7, backgroundColor: colors.disabled }, fill: { height: '100%', borderRadius: 7, backgroundColor: colors.primaryLight }, arrow: { alignSelf: 'flex-start', fontSize: 28, color: colors.textMuted }, errorText: { ...typography.caption, color: colors.danger } });
