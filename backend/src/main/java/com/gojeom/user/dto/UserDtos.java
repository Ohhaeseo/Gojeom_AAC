package com.gojeom.user.dto;

import com.gojeom.common.enums.AuthProvider;
import com.gojeom.common.enums.SubscriptionPlan;
import com.gojeom.common.enums.SubscriptionStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public final class UserDtos {

    private UserDtos() {
    }

    /**
     * {@code GET /users/me} 응답. <b>프론트의 최초 진입 라우팅 기준이다.</b>
     *
     * <p>{@code hasProfile}이 false면 프로필 등록 화면으로, true면 홈으로 보낸다.
     * (API.md C-1)
     */
    public record MeResponse(
            UUID id,
            String email,
            String nickname,
            AuthProvider provider,
            OffsetDateTime joinedAt,
            boolean hasProfile,
            int analysisCredits,
            SubscriptionInfo subscription) {
    }

    public record SubscriptionInfo(
            SubscriptionPlan plan,
            SubscriptionStatus status,
            OffsetDateTime expiresAt,
            boolean canAnalyze,
            boolean canCreateRoutine) {
    }
}
