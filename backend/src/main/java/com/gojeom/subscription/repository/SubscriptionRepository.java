package com.gojeom.subscription.repository;

import com.gojeom.subscription.entity.Subscription;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {

    Optional<Subscription> findByUserId(UUID userId);

    /** 같은 사용자의 분석 생성 요청을 직렬화한다. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Subscription s WHERE s.userId = :userId")
    Optional<Subscription> findByUserIdForUpdate(@Param("userId") UUID userId);

    /**
     * 분석 1회 사용 처리.
     *
     * <p><b>조회 후 저장하지 않는다.</b> 동시 요청이 같은 잔여값을 읽고 각자 차감하면
     * 중복 사용이 발생한다. 단일 UPDATE로 원자성을 확보한다. (ARCHITECTURE.md §7)
     *
     * <p><b>유료 구독은 차감하지 않는다.</b> 분석권은 무료 체험 1회를 세는 값이라
     * (PRD §11) 유료 구간에서 깎으면 0에 닿는 순간 결제한 사용자가 막힌다.
     * 그래서 {@code CASE}로 TRIAL일 때만 줄이고, 유료는 행만 맞춰 1을 돌려준다.
     * 판정 기준을 {@link com.gojeom.subscription.entity.Subscription#canAnalyze}와
     * 일치시켜 두 곳이 갈리지 않게 한다.
     *
     * @return 1이면 사용 가능(무료는 차감됨), 0이면 잔여 없음
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE Subscription s
               SET s.analysisCredits = CASE
                       WHEN s.plan = com.gojeom.common.enums.SubscriptionPlan.TRIAL
                       THEN s.analysisCredits - 1
                       ELSE s.analysisCredits
                   END
             WHERE s.userId = :userId
               AND (s.plan <> com.gojeom.common.enums.SubscriptionPlan.TRIAL
                    OR s.analysisCredits > 0)
            """)
    int consumeCredit(@Param("userId") UUID userId);
}
