package com.gojeom.profile.entity;

import com.gojeom.common.entity.BaseTimeEntity;
import com.gojeom.common.enums.Category;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

/**
 * 현재 프로필. 사진·우선순위·신체 정보를 담는다.
 *
 * <p>사용자당 {@code isActive = true}는 최대 1행이다. 사진을 다시 등록하면 기존 행을
 * 비활성화하고 새 행을 만든다. 과거 분석은 그 시점 프로필을 참조하므로 결과 재현이
 * 가능하다. (ERD.md §3.3)
 */
@Entity
@Table(name = "profiles")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Profile extends BaseTimeEntity {

    @Id
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /** 사진 삭제 시 null이 된다. 사진이 없으면 신규 분석을 시작할 수 없다. (PRD §10) */
    @Column(name = "photo_key", length = 512)
    private String photoKey;

    /**
     * <b>배열 순서가 곧 1·2·3순위다.</b> 정렬을 바꾸면 의미가 달라진다.
     * (ERD.md §5.1)
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "priorities", nullable = false)
    private List<Category> priorities;

    // 생년월일은 users로 옮겼다. (V9) 나이 확인은 계정 단위 법적 요구사항이라
    // 프로필이 만들어지기 전에 끝나야 한다.

    @Column(name = "gender", length = 20)
    private String gender;

    @Column(name = "height_cm", nullable = false)
    private short heightCm;

    @Column(name = "weight_kg", nullable = false, precision = 4, scale = 1)
    private BigDecimal weightKg;

    @Column(name = "sleep_hours", precision = 3, scale = 1)
    private BigDecimal sleepHours;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "inbody")
    private Inbody inbody;

    /** D2-2에서 AI가 채운다. 그전까지는 null이며 가짜 값을 넣지 않는다. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "analysis_summary")
    private ProfileAnalysisSummary analysisSummary;

    @Column(name = "is_active", nullable = false)
    private boolean isActive;

    private Profile(UUID userId, String photoKey, List<Category> priorities,
                    short heightCm, BigDecimal weightKg, BigDecimal sleepHours, Inbody inbody) {
        this.userId = userId;
        this.photoKey = photoKey;
        this.priorities = priorities;
        this.heightCm = heightCm;
        this.weightKg = weightKg;
        this.sleepHours = sleepHours;
        this.inbody = inbody;
        this.isActive = true;
    }

    public static Profile create(UUID userId, String photoKey, List<Category> priorities,
                                 short heightCm, BigDecimal weightKg,
                                 BigDecimal sleepHours, Inbody inbody) {
        return new Profile(userId, photoKey, priorities, heightCm, weightKg, sleepHours,
                inbody == null || inbody.isEmpty() ? null : inbody);
    }

    public void deactivate() {
        this.isActive = false;
    }

    /**
     * 사진은 그대로 두고 신체 정보만 갱신한다.
     *
     * <p><b>바뀐 값은 {@code analysis_summary}에도 반영돼야 한다.</b> 요약의
     * {@code bodyRange}·{@code healthNotes}가 이 수치들로 만들어지기 때문이다.
     * 그대로 두면 프롬프트 안에서 최신 수치와 옛 요약이 <b>서로 다른 말</b>을 하게 된다 —
     * G-5가 요약에 근거가 된 입력값을 인용시키므로, 낡은 요약은 틀린 근거를 명시적으로
     * 주장하는 문장이 된다.
     *
     * @return 요약에 반영되는 값이 실제로 바뀌었으면 true
     */
    public boolean updateBody(BigDecimal weightKg, BigDecimal sleepHours, Inbody inbody) {
        // 몸무게는 부분 갱신이다 — 안 보내면 지우는 것이 아니라 두는 것이다.
        BigDecimal nextWeight = weightKg != null ? weightKg : this.weightKg;
        Inbody nextInbody = inbody == null || inbody.isEmpty() ? null : inbody;

        boolean changed = !Inbody.sameValue(this.weightKg, nextWeight)
                || !Inbody.sameValue(this.sleepHours, sleepHours)
                || !Inbody.sameValues(this.inbody, nextInbody);

        this.weightKg = nextWeight;
        this.sleepHours = sleepHours;
        this.inbody = nextInbody;
        return changed;
    }

    /** 프로필 화면의 "우선 순위 변경". 기존 분석 결과는 재생성하지 않는다. */
    public void changePriorities(List<Category> priorities) {
        this.priorities = priorities;
    }

    public void applyAnalysisSummary(ProfileAnalysisSummary summary) {
        this.analysisSummary = summary;
    }

    public void removePhoto() {
        this.photoKey = null;
    }
}
