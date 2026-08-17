package com.gojeom.consent.entity;

import com.gojeom.consent.ConsentCode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UuidGenerator;

/**
 * 동의 이력. 사용자·항목당 1건이며 최신 상태를 담는다. (V1 · V9 유니크 인덱스)
 *
 * <p><b>거부도 기록한다.</b> {@code agreed = false}인 행이 남아야 "물어봤는데
 * 거부했다"와 "아직 안 물어봤다"를 구분할 수 있다. 선택 항목(마케팅)에서
 * 특히 중요하다.
 *
 * <p>{@code version}과 {@code agreedAt}을 함께 남긴다. 약관 문구가 바뀌면
 * 어느 버전에 동의했는지가 곧 증빙이 된다.
 */
@Entity
@Table(name = "consents")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Consent {

    @Id
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "code", nullable = false, length = 20)
    private ConsentCode code;

    /** 동의 시점의 필수 여부. 정책이 바뀌어도 당시 기준이 남는다. */
    @Column(name = "required", nullable = false)
    private boolean required;

    @Column(name = "version", nullable = false, length = 20)
    private String version;

    @Column(name = "agreed", nullable = false)
    private boolean agreed;

    /** 거부한 항목은 null이다. */
    @Column(name = "agreed_at")
    private OffsetDateTime agreedAt;

    private Consent(UUID userId, ConsentCode code, String version, boolean agreed, OffsetDateTime at) {
        this.userId = userId;
        this.code = code;
        this.required = code.isRequired();
        this.version = version;
        this.agreed = agreed;
        this.agreedAt = agreed ? at : null;
    }

    public static Consent of(UUID userId, ConsentCode code, String version, boolean agreed, OffsetDateTime at) {
        return new Consent(userId, code, version, agreed, at);
    }
}
