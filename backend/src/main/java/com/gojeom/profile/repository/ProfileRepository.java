package com.gojeom.profile.repository;

import com.gojeom.profile.entity.Profile;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfileRepository extends JpaRepository<Profile, UUID> {

    Optional<Profile> findByUserIdAndIsActiveTrue(UUID userId);

    /** {@code GET /users/me}의 {@code hasProfile} 판정. (API.md C-1) */
    boolean existsByUserIdAndIsActiveTrue(UUID userId);
}
