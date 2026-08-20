package com.gojeom.subscription;

import com.gojeom.common.enums.SubscriptionPlan;
import com.gojeom.common.exception.BusinessException;
import com.gojeom.common.exception.ErrorCode;
import com.gojeom.subscription.dto.SubscriptionDtos.ProductResponse;
import com.gojeom.subscription.dto.SubscriptionDtos.SubscribeRequest;
import com.gojeom.subscription.dto.SubscriptionDtos.SubscriptionResponse;
import com.gojeom.subscription.entity.Subscription;
import com.gojeom.subscription.repository.SubscriptionRepository;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 구독 조회와 전환. (API.md §6.8 · PRD §11 · F-12)
 *
 * <p><b>결제가 붙어 있지 않다.</b> {@code subscribe}를 부르면 그 자리에서 유료로 바뀐다.
 * PG 연동과 웹훅({@code POST /subscriptions/webhook})은 여전히 범위 밖이다.
 *
 * <p>가짜 응답을 돌려주는 것이 아니라 <b>구독 행을 실제로 바꾼다</b> — 이후의 분석
 * 무제한도 그 상태를 보고 동작한다. ([AGENTS.md](../../../../../../../AGENTS.md) 규칙 15)
 */
@Service
@RequiredArgsConstructor
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;

    /** 고를 수 있는 유료 요금제. TRIAL은 가입 시 자동 발급이라 목록에 넣지 않는다. */
    private static final List<ProductResponse> PRODUCTS = Arrays.stream(SubscriptionPlan.values())
            .filter(SubscriptionPlan::isUnlimited)
            .map(plan -> new ProductResponse(plan, plan.amount(), plan.label()))
            .toList();

    @Transactional(readOnly = true)
    public SubscriptionResponse me(UUID userId) {
        return toResponse(load(userId));
    }

    /**
     * 유료 구독으로 전환한다.
     *
     * <p>이미 유료여도 막지 않는다 — 같은 요금제를 다시 누르면 기간이 갱신된다.
     * 결제가 없으니 중복 청구 위험도 없다.
     */
    @Transactional
    public SubscriptionResponse subscribe(UUID userId, SubscribeRequest request) {
        if (!request.plan().isUnlimited()) {
            // TRIAL은 가입 시 자동 발급되는 것이지 사용자가 고르는 값이 아니다.
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    java.util.Map.of("plan", "월 구독 또는 연 구독만 선택할 수 있어요."));
        }
        Subscription subscription = subscriptionRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        subscription.subscribe(request.plan(), OffsetDateTime.now(ZoneOffset.UTC));
        return toResponse(subscription);
    }

    private Subscription load(UUID userId) {
        return subscriptionRepository.findByUserId(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private SubscriptionResponse toResponse(Subscription s) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        return new SubscriptionResponse(
                s.getPlan(),
                s.getStatus(),
                s.getAnalysisCredits(),
                s.getPlan().isUnlimited(),
                s.getExpiresAt(),
                s.canAnalyze(now),
                s.canCreateRoutine(now),
                PRODUCTS);
    }
}
