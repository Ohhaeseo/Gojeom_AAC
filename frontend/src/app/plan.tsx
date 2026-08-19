import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/layout/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { PlanPicker } from '@/components/subscription/PlanPicker';
import { useAppState } from '@/state/AppState';
import { toIsoDate } from '@/lib/date';
import type { SubscriptionPlan } from '@/types/api';
import { colors, radius, spacing, typography } from '@/theme/tokens';

/** 요금제 화면. 설정에서 들어온다. (PRD §11) */
export default function PlanScreen() {
  const { subscription, loadSubscription, subscribeToPlan, mode } = useAppState();
  const [plan, setPlan] = useState<SubscriptionPlan>('MONTHLY');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  /**
   * 아직 못 받았을 때 **"불러오는 중"과 "못 불러왔음"을 구분한다.**
   * 실패를 로딩으로 위장하면 사용자가 영영 기다린다.
   */
  const [loading, setLoading] = useState(true);

  useEffect(() => { void loadSubscription().finally(() => setLoading(false)); }, [loadSubscription]);

  const emptyNote = loading ? '불러오는 중이에요.'
    : mode === 'mock' ? '서버에 연결되어 있지 않아요.'
    : '요금제를 불러오지 못했어요. 로그인 상태를 확인해주세요.';

  const subscribe = useCallback(async () => {
    setPending(true);
    setError('');
    setMessage('');
    const result = await subscribeToPlan(plan);
    setPending(false);
    if (!result.ok) { setError(result.message ?? '구독하지 못했어요.'); return; }
    setMessage('구독이 시작됐어요. 이제 분석을 횟수 제한 없이 이용할 수 있어요.');
  }, [plan, subscribeToPlan]);

  const paid = subscription?.unlimited === true;

  return (
    <AppScreen navigation contentStyle={styles.content}>
      <View>
        <Text style={styles.title}>요금제</Text>
        <Text style={styles.lead}>앱은 무료예요. 고점 분석을 더 하고 싶을 때만 구독하면 돼요.</Text>
      </View>

      {/* 지금 상태 — 서버가 준 값만 그린다. 못 받았으면 숫자를 지어내지 않는다. */}
      <View style={styles.card}>
        <Text style={styles.label}>현재 이용권</Text>
        {subscription ? (
          <>
            <Text style={styles.current}>{planLabel[subscription.plan]}</Text>
            <Text style={styles.description}>
              {paid
                ? '고점 분석을 횟수 제한 없이 이용할 수 있어요.'
                : `남은 분석권 ${subscription.analysisCredits}회`}
            </Text>
            {subscription.expiresAt
              ? <Text style={styles.description}>{toIsoDate(new Date(subscription.expiresAt))}까지</Text>
              : null}
          </>
        ) : (
          <Text style={styles.description}>{emptyNote}</Text>
        )}
      </View>

      <Text style={styles.label}>구독하기</Text>
      {subscription?.products.length
        ? <PlanPicker products={subscription.products} selected={plan} onSelect={setPlan} />
        : <Text style={styles.description}>{emptyNote}</Text>}

      <View style={styles.card}>
        <Text style={styles.label}>구독하면</Text>
        <Text style={styles.description}>· 고점 분석 무제한{'\n'}· 분석 결과로 맞춤 목표 만들기{'\n'}· 서랍에 결과 보관</Text>
      </View>

      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <AppButton
        label={pending ? '처리 중...' : paid ? '구독 갱신하기' : '구독하기'}
        disabled={pending || !subscription?.products.length}
        onPress={() => void subscribe()}
      />
      {paid ? <AppButton label="분석하러 가기" variant="outline" onPress={() => router.push('/analysis-new')} /> : null}

      <Text style={styles.disclaimer}>
        지금은 실제 결제가 연결되어 있지 않아요. 누르면 바로 이용할 수 있고, 요금이 청구되지 않아요.
      </Text>
    </AppScreen>
  );
}

const planLabel: Record<SubscriptionPlan, string> = {
  TRIAL: '무료 체험',
  MONTHLY: '월 구독',
  YEARLY: '연 구독',
};

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  title: { ...typography.h1, color: colors.text },
  lead: { ...typography.body, color: colors.textTertiary },
  card: { gap: 6, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface },
  label: { ...typography.label, color: colors.text },
  current: { ...typography.title, color: colors.primaryPressed },
  description: { ...typography.caption, color: colors.textMuted, lineHeight: 22 },
  success: { ...typography.caption, color: colors.primaryPressed },
  error: { ...typography.caption, color: colors.danger },
  disclaimer: { ...typography.caption, color: colors.textMuted },
});
