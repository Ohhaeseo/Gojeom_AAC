package com.gojeom.subscription.dto;

import com.gojeom.common.enums.SubscriptionPlan;
import com.gojeom.common.enums.SubscriptionStatus;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.util.List;

/** 구독 API 계약. (API.md §6.8) */
public final class SubscriptionDtos {

    private SubscriptionDtos() {
    }

    /**
     * {@code GET /subscriptions/me} · {@code POST /subscriptions/subscribe} 응답.
     *
     * <p>{@code analysisCredits}는 <b>무료 체험에서만 의미가 있다.</b> 유료 구독은
     * 횟수를 세지 않으므로 이 값 대신 {@code unlimited}를 봐야 한다.
     * 화면이 잔여 횟수를 그리려다 유료 사용자에게 "0회 남음"을 띄우는 일을 막는다.
     */
    public record SubscriptionResponse(
            SubscriptionPlan plan,
            SubscriptionStatus status,
            short analysisCredits,
            boolean unlimited,
            OffsetDateTime expiresAt,
            boolean canAnalyze,
            boolean canCreateRoutine,
            List<ProductResponse> products) {
    }

    /** 고를 수 있는 유료 요금제. 가격은 {@link SubscriptionPlan#amount()}가 정본이다. */
    public record ProductResponse(SubscriptionPlan plan, int amount, String label) {
    }

    /**
     * {@code POST /subscriptions/subscribe} 요청.
     *
     * <p><b>결제 정보가 없다.</b> 결제 연동은 범위 밖이라 요금제만 받아 즉시 활성화한다.
     * PG가 붙으면 이 자리에 결제 토큰이 추가되고 활성화는 웹훅으로 옮겨간다.
     */
    public record SubscribeRequest(@NotNull SubscriptionPlan plan) {
    }
}
