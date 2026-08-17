package com.gojeom.consent.repository;

import com.gojeom.consent.entity.Consent;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConsentRepository extends JpaRepository<Consent, UUID> {

    /**
     * 지금 동의 상태. 사용자·항목당 1건이다. (V9 유니크 인덱스)
     *
     * <p>탈퇴(soft delete)해도 지우지 않는다. <b>동의를 받았다는 사실 자체가
     * 증빙</b>이라 계정보다 오래 남아야 한다.
     */
    List<Consent> findAllByUserId(UUID userId);
}
