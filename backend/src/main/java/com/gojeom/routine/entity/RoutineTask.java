package com.gojeom.routine.entity;

import com.gojeom.common.enums.Category;
import com.gojeom.common.enums.ProblemCode;
import com.gojeom.common.enums.RoutineImportance;
import com.gojeom.common.enums.TaskStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UuidGenerator;

/**
 * 목표의 태스크 1건. (ERD.md §3.9)
 *
 * <p>화면 표기는 {@code title} 아래에 {@code timing / durationLabel / amountLabel}을
 * {@code " / "}로 이어 한 줄로 그린다.
 *
 * <pre>
 * 자외선 차단제 바르기
 * 매일 외출 전 / 약 2분 / 4ml          [ ] 완료
 * </pre>
 *
 * <p>{@code created_at} 컬럼이 없어 베이스 엔티티를 상속하지 않는다.
 */
@Entity
@Table(name = "routine_tasks")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RoutineTask {

    @Id
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "routine_id", nullable = false)
    private UUID routineId;

    /** 3종이다. 목표가 여러 카테고리에 걸치므로 카테고리는 태스크 단위 속성이다. */
    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 10)
    private Category category;

    @Column(name = "title", nullable = false, length = 60)
    private String title;

    @Column(name = "timing", length = 40)
    private String timing;

    @Column(name = "duration_label", length = 20)
    private String durationLabel;

    @Column(name = "amount_label", length = 20)
    private String amountLabel;

    /**
     * 이 배정이 속한 주의 첫날. 주 N회의 "그 주"를 세는 기준이다. (V15)
     *
     * <p>ISO 월요일이 아니라 <b>목표 시작일 기준</b>이다 — {@link com.gojeom.routine.TaskScheduleExpander}.
     */
    @Column(name = "week_start", nullable = false)
    private LocalDate weekStart;

    /**
     * 그 주에 몇 번 하면 되는지. <b>null이면 매일 하는 일</b>이라 그날 한 번으로 끝난다.
     *
     * <p>값이 있으면 그 주의 모든 날에 행이 있고, 그중 이 수만큼 체크하면 채워진 것이다.
     * 어느 요일에 할지는 서버가 정하지 않는다 — 정해 주면 그날 못 한 사람이 회차를 잃는다.
     */
    @Column(name = "weekly_target")
    private Short weeklyTarget;

    /**
     * 이 목표에서의 무게. (V16)
     *
     * <p>🔴 <b>NOT NULL DEFAULT 'CORE'다.</b> V16 이전 태스크에는 값이 없는데,
     * nullable로 두면 "필수만 보기"에서 옛 목표의 할 일이 통째로 사라진다.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "importance", nullable = false, length = 10)
    private RoutineImportance importance;

    /**
     * 이 행동이 푸는 문제. <b>null일 수 있다</b> — V16 이전 태스크에는 근거가 없고,
     * 없는 것을 지어 채우면 이 필드를 둔 목적을 스스로 어긴다.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "problem_code", length = 30)
    private ProblemCode problemCode;

    /** 왜 이 사용자에게 이 행동인가. null이면 화면은 그 줄을 <b>그리지 않는다.</b> */
    @Column(name = "reason", length = 200)
    private String reason;

    /** 무엇이 어떻게 달라지는가. 마찬가지로 null일 수 있다. */
    @Column(name = "expected_effect", length = 200)
    private String expectedEffect;

    @Column(name = "scheduled_date", nullable = false)
    private LocalDate scheduledDate;

    /** 알림 시각용. 현재는 채우지 않는다 — 알림 설정 화면이 붙을 때 쓴다. */
    @Column(name = "scheduled_time")
    private LocalTime scheduledTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private TaskStatus status;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    /**
     * 태스크가 <b>왜</b> 있는지. 값이 늘어 생성자가 길어지는 것을 막으려고 묶었다.
     *
     * <p>{@code problemCode}·{@code reason}·{@code expectedEffect}는 null일 수 있다.
     * {@code importance}만 반드시 있어야 한다 — 없으면 화면이 무엇을 먼저 보여줄지 모른다.
     */
    public record Detail(RoutineImportance importance, ProblemCode problemCode,
                         String reason, String expectedEffect) {

        public static Detail core() {
            return new Detail(RoutineImportance.CORE, null, null, null);
        }
    }

    private RoutineTask(UUID routineId, Category category, String title, String timing,
                        String durationLabel, String amountLabel, LocalDate scheduledDate,
                        LocalDate weekStart, Integer weeklyTarget, Detail detail) {
        this.routineId = routineId;
        this.category = category;
        this.importance = detail.importance();
        this.problemCode = detail.problemCode();
        this.reason = detail.reason();
        this.expectedEffect = detail.expectedEffect();
        this.title = title;
        this.timing = timing;
        this.durationLabel = durationLabel;
        this.amountLabel = amountLabel;
        this.scheduledDate = scheduledDate;
        this.weekStart = weekStart;
        // DB는 SMALLINT다. 호출부는 AI가 준 int를 그대로 넘기고 여기서 좁힌다.
        this.weeklyTarget = weeklyTarget == null ? null : weeklyTarget.shortValue();
        this.status = TaskStatus.PENDING;
    }

    public static RoutineTask of(UUID routineId, Category category, String title, String timing,
                                 String durationLabel, String amountLabel, LocalDate scheduledDate,
                                 LocalDate weekStart, Integer weeklyTarget, Detail detail) {
        return new RoutineTask(routineId, category, title, timing,
                durationLabel, amountLabel, scheduledDate, weekStart, weeklyTarget, detail);
    }

    /**
     * 완료 체크 토글.
     *
     * <p>{@code completedAt}은 {@code DONE}일 때만 남긴다. 체크를 풀면 지운다 —
     * 완료 시각이 남아 있는 미완료 태스크는 데이터로서 거짓이다.
     */
    public void changeStatus(TaskStatus next) {
        this.status = next;
        this.completedAt = next == TaskStatus.DONE ? OffsetDateTime.now(ZoneOffset.UTC) : null;
    }
}
