import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SubscriptionPlan, SubscriptionProduct } from '@/types/api';
import { colors, radius, spacing, typography } from '@/theme/tokens';

/**
 * 요금제 선택 카드. 구독 모달과 요금제 화면이 함께 쓴다.
 *
 * **가격을 화면에 상수로 박지 않는다.** 서버(`SubscriptionPlan.amount()`)가 정본이라
 * 여기서 다시 적으면 값이 갈린다. 목록이 비면 아무것도 그리지 않는다.
 */
export function PlanPicker({
  products,
  selected,
  onSelect,
}: {
  products: SubscriptionProduct[];
  selected?: SubscriptionPlan;
  onSelect: (plan: SubscriptionPlan) => void;
}) {
  return (
    <View style={styles.list}>
      {products.map((product) => {
        const active = selected === product.plan;
        return (
          <Pressable
            key={product.plan}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${product.label} ${formatWon(product.amount)}`}
            onPress={() => onSelect(product.plan)}
            style={[styles.card, active && styles.cardOn]}
          >
            <View style={styles.copy}>
              <Text style={[styles.label, active && styles.labelOn]}>{product.label}</Text>
              <Text style={styles.note}>{noteOf(product)}</Text>
            </View>
            <Text style={[styles.amount, active && styles.labelOn]}>{formatWon(product.amount)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** `8900` → `8,900원`. */
export const formatWon = (amount: number) => `${amount.toLocaleString('ko-KR')}원`;

/**
 * 연 구독의 할인율은 **계산해서 보여준다.**
 *
 * "17% 할인" 같은 문구를 적어두면 가격을 바꿨을 때 조용히 거짓말이 된다.
 * 월 구독을 모르면(목록에 없으면) 아무 말도 하지 않는다.
 */
function noteOf(product: SubscriptionProduct) {
  if (product.plan === 'MONTHLY') return '매달 결제 · 분석 무제한';
  if (product.plan === 'YEARLY') return `연 1회 결제 · 월 ${formatWon(Math.round(product.amount / 12))} 꼴`;
  return '';
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  card: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  cardOn: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  copy: { flex: 1, gap: 2 },
  label: { ...typography.label, color: colors.text },
  labelOn: { color: colors.primaryPressed },
  note: { ...typography.caption, color: colors.textMuted },
  amount: { ...typography.label, color: colors.text },
});
