package com.gojeom.subscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.gojeom.common.enums.SubscriptionPlan;
import com.gojeom.common.enums.SubscriptionStatus;
import com.gojeom.subscription.entity.Subscription;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 유료 구독의 분석 허용 판정. (PRD §11 · AGENTS.md §4 2026-08-19 결정)
 *
 * <p>여기서 지키려는 것은 하나다 — <b>돈을 낸 사용자가 분석권 0 때문에 막히지 않는 것.</b>
 * 분석권은 무료 체험 1회를 세는 값이라 유료 구간까지 끌고 가면 안 된다.
 * {@code SubscriptionRepository.consumeCredit}의 {@code CASE}도 같은 기준을 쓴다.
 */
class SubscriptionPlanGatingTest {

    private static final OffsetDateTime NOW = OffsetDateTime.of(
            2026, 8, 19, 12, 0, 0, 0, ZoneOffset.UTC);

    private Subscription trial() {
        return Subscription.startTrial(UUID.randomUUID(), NOW);
    }

    @Test
    @DisplayName("무료 체험은 분석권이 있어야 분석할 수 있다")
    void trialNeedsCredit() {
        Subscription subscription = trial();
        assertThat(subscription.getPlan()).isEqualTo(SubscriptionPlan.TRIAL);
        assertThat(subscription.getAnalysisCredits()).isEqualTo((short) 1);
        assertThat(subscription.canAnalyze(NOW)).isTrue();
    }

    @Test
    @DisplayName("🔴 유료로 전환하면 분석권이 0이어도 분석할 수 있다")
    void paidIgnoresCredits() {
        Subscription subscription = trial();
        subscription.subscribe(SubscriptionPlan.MONTHLY, NOW);

        // 전환은 분석권을 채워주지 않는다. 세지 않을 뿐이다.
        assertThat(subscription.getAnalysisCredits()).isEqualTo((short) 1);
        assertThat(subscription.getPlan().isUnlimited()).isTrue();
        assertThat(subscription.canAnalyze(NOW)).isTrue();
    }

    @Test
    @DisplayName("월 구독은 1개월, 연 구독은 1년 뒤에 만료된다")
    void expiryFollowsPlan() {
        Subscription monthly = trial();
        monthly.subscribe(SubscriptionPlan.MONTHLY, NOW);
        assertThat(monthly.getExpiresAt()).isEqualTo(NOW.plusMonths(1));

        Subscription yearly = trial();
        yearly.subscribe(SubscriptionPlan.YEARLY, NOW);
        assertThat(yearly.getExpiresAt()).isEqualTo(NOW.plusYears(1));
    }

    @Test
    @DisplayName("만료된 유료 구독은 무제한이어도 분석할 수 없다")
    void expiredPaidIsBlocked() {
        Subscription subscription = trial();
        subscription.subscribe(SubscriptionPlan.MONTHLY, NOW);

        assertThat(subscription.canAnalyze(NOW.plusMonths(1).plusSeconds(1))).isFalse();
        assertThat(subscription.canCreateRoutine(NOW.plusMonths(1).plusSeconds(1))).isFalse();
    }

    @Test
    @DisplayName("TRIAL로는 전환할 수 없다 — 가입 시 자동 발급되는 것이지 고르는 값이 아니다")
    void cannotSubscribeToTrial() {
        assertThatThrownBy(() -> trial().subscribe(SubscriptionPlan.TRIAL, NOW))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("가격과 무제한 여부는 요금제가 안다")
    void planKnowsItsPrice() {
        assertThat(SubscriptionPlan.TRIAL.isUnlimited()).isFalse();
        assertThat(SubscriptionPlan.MONTHLY.isUnlimited()).isTrue();
        assertThat(SubscriptionPlan.YEARLY.isUnlimited()).isTrue();

        // 화면이 아니라 여기가 정본이다. 〔2026-08-20 인하: 8,900 → 4,900 · 89,000 → 49,000〕
        assertThat(SubscriptionPlan.MONTHLY.amount()).isEqualTo(4_900);
        assertThat(SubscriptionPlan.YEARLY.amount()).isEqualTo(49_000);
    }

    @Test
    @DisplayName("전환하면 상태가 ACTIVE가 된다")
    void subscribeActivates() {
        Subscription subscription = trial();
        subscription.subscribe(SubscriptionPlan.MONTHLY, NOW);
        assertThat(subscription.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(subscription.getStartedAt()).isEqualTo(NOW);
    }

    // CANCELED·EXPIRED 상태는 이 엔티티의 공개 API로 만들 수 없어 여기서 검사하지
    // 않는다. 상태를 바꾸는 경로(해지·만료 배치)가 생기면 그때 함께 추가한다.
}
