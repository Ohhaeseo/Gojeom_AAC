import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GoModal } from '@/components/ui/GoModal';
import { PlanPicker } from '@/components/subscription/PlanPicker';
import { useAppState } from '@/state/AppState';
import type { SubscriptionPlan } from '@/types/api';
import { colors, typography } from '@/theme/tokens';

/**
 * 분석권을 다 쓴 뒤 뜨는 구독 안내. (PRD §11 · F-12)
 *
 * **결제가 붙어 있지 않다.** `구독하기`를 누르면 서버의 구독 행이 그 자리에서
 * 유료로 바뀌고, 이후 분석이 무제한이 된다. 가짜 화면이 아니라 실제로 상태가
 * 바뀐다. (AGENTS.md 규칙 15)
 *
 * 성공하면 `onSubscribed`가 불린다 — 부르는 쪽이 하려던 일을 다시 시도하면 된다.
 */
export function SubscribeModal({
  visible,
  onClose,
  onSubscribed,
}: {
  visible: boolean;
  onClose: () => void;
  onSubscribed: () => void;
}) {
  const { subscription, loadSubscription, subscribeToPlan } = useAppState();
  const [plan, setPlan] = useState<SubscriptionPlan>('MONTHLY');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  /** 못 받은 것을 "불러오는 중"으로 위장하지 않는다. */
  const [loading, setLoading] = useState(true);

  // 요금제 목록은 서버가 준다. 열릴 때 한 번 받아온다.
  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    void loadSubscription().finally(() => setLoading(false));
  }, [loadSubscription, visible]);

  const products = subscription?.products ?? [];

  const confirm = async () => {
    setPending(true);
    setError('');
    const result = await subscribeToPlan(plan);
    setPending(false);
    if (!result.ok) { setError(result.message ?? '구독하지 못했어요.'); return; }
    onSubscribed();
  };

  return (
    <GoModal
      visible={visible}
      title="분석권을 모두 사용했어요"
      description="구독하면 고점 분석을 횟수 제한 없이 이용할 수 있어요."
      confirmLabel={pending ? '처리 중...' : '구독하기'}
      confirmDisabled={pending || !products.length}
      onConfirm={() => void confirm()}
      onClose={onClose}
    >
      {/* 목록을 못 받았으면 가격을 지어내지 않는다. (규칙 15) */}
      {products.length
        ? <PlanPicker products={products} selected={plan} onSelect={setPlan} />
        : <Text style={styles.note}>{loading ? '요금제를 불러오는 중이에요.' : '요금제를 불러오지 못했어요. 잠시 후 다시 시도해주세요.'}</Text>}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View accessibilityRole="text"><Text style={styles.disclaimer}>지금은 실제 결제가 연결되어 있지 않아요. 누르면 바로 이용할 수 있어요.</Text></View>
    </GoModal>
  );
}

const styles = StyleSheet.create({
  note: { ...typography.caption, color: colors.textMuted },
  error: { ...typography.caption, color: colors.danger },
  disclaimer: { ...typography.caption, color: colors.textMuted },
});
