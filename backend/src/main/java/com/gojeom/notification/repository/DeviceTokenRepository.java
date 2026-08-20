package com.gojeom.notification.repository;

import com.gojeom.notification.entity.DeviceToken;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeviceTokenRepository extends JpaRepository<DeviceToken, UUID> {

    /** 토큰이 전역 UNIQUE라 재등록 판정에 쓴다. */
    Optional<DeviceToken> findByToken(String token);

    List<DeviceToken> findByUserId(UUID userId);

    /** 더 이상 유효하지 않다고 Expo가 알려준 토큰을 지운다. */
    void deleteByTokenIn(Collection<String> tokens);
}
