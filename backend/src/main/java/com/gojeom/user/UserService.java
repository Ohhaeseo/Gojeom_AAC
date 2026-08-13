package com.gojeom.user;

import com.gojeom.common.exception.BusinessException;
import com.gojeom.common.exception.ErrorCode;
import com.gojeom.subscription.entity.Subscription;
import com.gojeom.subscription.repository.SubscriptionRepository;
import com.gojeom.user.dto.UserDtos.MeResponse;
import com.gojeom.user.dto.UserDtos.SubscriptionInfo;
import com.gojeom.user.entity.User;
import com.gojeom.user.repository.UserRepository;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;

    @Transactional(readOnly = true)
    public MeResponse getMe(UUID userId) {
        User user = userRepository.findByIdAndDeletedAtIsNull(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        Subscription subscription = subscriptionRepository.findByUserId(userId).orElse(null);

        // 프로필 도메인은 D1-7에서 붙는다. 그때까지는 항상 false다.
        // 프론트는 이 값에 따라 프로필 등록 화면으로 보낸다.
        boolean hasProfile = false;

        return new MeResponse(
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                user.getProvider(),
                user.getCreatedAt(),
                hasProfile,
                subscription == null ? 0 : subscription.getAnalysisCredits(),
                toInfo(subscription, now));
    }

    private SubscriptionInfo toInfo(Subscription subscription, OffsetDateTime now) {
        if (subscription == null) {
            return null;
        }
        return new SubscriptionInfo(
                subscription.getPlan(),
                subscription.getStatus(),
                subscription.getExpiresAt(),
                subscription.canAnalyze(now),
                subscription.canCreateRoutine(now));
    }
}
