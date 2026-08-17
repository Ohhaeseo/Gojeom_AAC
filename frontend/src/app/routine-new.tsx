import { router } from 'expo-router';
import { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/layout/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { endDateOf, formatDate } from '@/lib/date';
import { MAX_MONTHS, MIN_MONTHS, WEEKS_PER_MONTH, useAppState, type RoutinePlanItem } from '@/state/AppState';
import { colors, radius, shadow, spacing, typography } from '@/theme/tokens';
import type { Category } from '@/types/api';

/**
 * 경로 B — 분석 없이 목표 만들기. (PRD F-09 · API.md §6.6)
 *
 * 진단을 안 한 사람도 여기서 바로 시작할 수 있다. 카테고리마다 목표가 1개씩 생긴다.
 *
 * **카테고리별 최소 기간이 다르다.** 변화가 눈에 보이기까지 걸리는 시간이 달라서다.
 * 최소 미만은 아예 고를 수 없게 막는다 — 고르게 해놓고 저장할 때 튕기면 최악이다.
 * 같은 규칙이 서버에도 있다. (`RoutinePolicy`)
 */
const CATEGORIES: { key: Category; label: string; hint: string }[] = [
  { key: 'SKIN', label: '피부', hint: '피부는 턴오버가 여러 번 돌아야 달라져요' },
  { key: 'BODY', label: '체형', hint: '체형은 한 달 단위로 확인하는 게 좋아요' },
  { key: 'HEALTH', label: '건강', hint: '생활 습관은 짧게 시작해도 괜찮아요' },
];

const animate = () => LayoutAnimation.configureNext({
  duration: 220,
  create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  update: { type: LayoutAnimation.Types.easeInEaseOut },
  delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
});

export default function RoutineNewScreen() {
  const { createRoutines, profile } = useAppState();
  const [months, setMonths] = useState<Partial<Record<Category, number>>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const selected = CATEGORIES.filter((item) => months[item.key] != null);
  const today = new Date();

  const toggle = (category: Category) => {
    animate();
    setError('');
    setMonths((current) => {
      const next = { ...current };
      if (next[category] != null) delete next[category];
      else next[category] = MIN_MONTHS[category];
      return next;
    });
  };

  const step = (category: Category, delta: number) => {
    setMonths((current) => {
      const value = (current[category] ?? MIN_MONTHS[category]) + delta;
      // 최소 미만·최대 초과로는 내려가지 않는다. 버튼도 함께 비활성화된다.
      if (value < MIN_MONTHS[category] || value > MAX_MONTHS) return current;
      return { ...current, [category]: value };
    });
  };

  const submit = async () => {
    const items: RoutinePlanItem[] = selected.map((item) => ({ category: item.key, months: months[item.key]! }));
    setPending(true); setError('');
    const outcome = await createRoutines(items);
    setPending(false);
    if (!outcome.ok) return setError(outcome.message ?? '목표를 만들지 못했어요.');
    router.replace('/routines');
  };

  // 분석은 없어도 되지만 **프로필은 있어야 한다.** AI가 근거로 쓸 것이 신체 정보와
  // 우선순위뿐이기 때문이다. 폼을 다 채운 뒤 서버에서 막히면 헛수고가 된다.
  if (!profile) return (
    <AppScreen navigation contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>진단 없이 시작하기</Text>
        <Text style={styles.title}>프로필을 먼저 등록해주세요</Text>
        <Text style={styles.lead}>진단은 건너뛰어도 되지만, 키·몸무게와 우선순위는 있어야{`\n`}나에게 맞는 루틴을 만들 수 있어요.</Text>
      </View>
      <AppButton label="프로필 등록하기" onPress={() => router.replace('/photo')} />
    </AppScreen>
  );

  return (
    <AppScreen navigation contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>진단 없이 시작하기</Text>
        <Text style={styles.title}>어떤 걸 바꿔볼까요?</Text>
        <Text style={styles.lead}>고르는 만큼 목표가 하나씩 만들어져요.{`\n`}나중에 진단을 하면 결과로 다시 만들 수도 있어요.</Text>
      </View>

      {CATEGORIES.map((item) => {
        const value = months[item.key];
        const on = value != null;
        const min = MIN_MONTHS[item.key];
        return (
          // 스테퍼를 카드 Pressable 안에 넣으면 −·+ 를 누를 때 이벤트가 카드로 올라가
          // 카드가 접힌다. 특히 비활성 스테퍼는 자기가 이벤트를 삼키지도 않는다.
          // 그래서 **누를 수 있는 영역은 헤더뿐**이고 스테퍼는 형제로 둔다.
          <View key={item.key} style={[styles.card, on && styles.cardOn]}>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${item.label} 목표 만들기`} onPress={() => toggle(item.key)} style={styles.cardHead}>
              <View style={styles.cardCopy}>
                <View style={styles.titleRow}>
                  <Text style={[styles.cardTitle, on && styles.cardTitleOn]}>{item.label}</Text>
                  {min > 1 ? <View style={styles.minBadge}><Text style={styles.minBadgeText}>최소 {min}개월</Text></View> : null}
                </View>
                <Text style={styles.hint}>{item.hint}</Text>
              </View>
              <View style={[styles.check, on && styles.checkOn]}><Text style={styles.checkMark}>{on ? '✓' : ''}</Text></View>
            </Pressable>

            {on ? (
              <View style={styles.stepperArea}>
                <View style={styles.stepper}>
                  <StepButton label="−" disabled={value <= min} onPress={() => step(item.key, -1)} />
                  <View style={styles.valueWrap}><Text style={styles.value}>{value}</Text><Text style={styles.unit}>개월</Text></View>
                  <StepButton label="+" disabled={value >= MAX_MONTHS} onPress={() => step(item.key, 1)} />
                </View>
                <Text style={styles.range}>{formatDate(today)} — {formatDate(endDateOf(today, value * WEEKS_PER_MONTH))}</Text>
              </View>
            ) : null}
          </View>
        );
      })}

      {selected.length ? <Text style={styles.summary}>목표 {selected.length}개가 만들어져요 · {selected.map((item) => `${item.label} ${months[item.key]}개월`).join(' · ')}</Text> : <Text style={styles.summaryMuted}>카테고리를 1개 이상 골라주세요.</Text>}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <AppButton label={pending ? '목표를 만들고 있어요...' : '루틴 만들기'} disabled={!selected.length || pending} onPress={submit} />
    </AppScreen>
  );
}

function StepButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === '+' ? '기간 1개월 늘리기' : '기간 1개월 줄이기'}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.stepBtn, disabled && styles.stepBtnOff, pressed && !disabled && styles.stepBtnPressed]}
    >
      <Text style={[styles.stepText, disabled && styles.stepTextOff]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  header: { gap: 6, marginBottom: 4 },
  eyebrow: { ...typography.label, color: colors.primary },
  title: { ...typography.h1, color: colors.text },
  lead: { ...typography.body, color: colors.textMuted },
  card: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: 'transparent', backgroundColor: colors.surface, ...shadow },
  cardOn: { borderColor: colors.primary },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardCopy: { flex: 1, gap: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { ...typography.title, color: colors.text },
  cardTitleOn: { color: colors.primary },
  minBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: '#E1FAF2' },
  minBadgeText: { ...typography.caption, color: colors.primaryPressed, fontWeight: '700' },
  hint: { ...typography.caption, color: colors.textMuted },
  check: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: colors.disabled, backgroundColor: colors.surface },
  checkOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  checkMark: { color: colors.white, fontSize: 15, fontWeight: '700' },
  stepperArea: { gap: 10, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  stepBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#E1FAF2' },
  stepBtnOff: { backgroundColor: colors.surfaceSunken },
  stepBtnPressed: { transform: [{ scale: 0.94 }] },
  stepText: { fontSize: 22, lineHeight: 26, color: colors.primaryPressed, fontWeight: '700' },
  stepTextOff: { color: colors.disabled },
  valueWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  value: { ...typography.display, color: colors.text },
  unit: { ...typography.label, color: colors.textMuted },
  range: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  summary: { ...typography.caption, color: colors.textTertiary, textAlign: 'center' },
  summaryMuted: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  errorText: { ...typography.caption, color: colors.danger, textAlign: 'center' },
});
