package com.gojeom.routine.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.gojeom.common.enums.Category;
import com.gojeom.common.enums.RoutineSourceType;
import com.gojeom.common.enums.TaskStatus;
import com.gojeom.routine.RoutinePolicy;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** 목표 API 계약. (API.md §6.6) */
public final class RoutineDtos {

    private RoutineDtos() {
    }

    // ------------------------------------------------------------ POST /routines

    /**
     * {@code sourceType}으로 분기하는 단일 요청. (PRD F-09)
     *
     * <p>경로마다 채워야 하는 필드가 달라 {@code @AssertTrue}로 조합을 검증한다.
     * 잘못된 조합은 DB의 {@code ck_routine_source} 제약까지 가기 전에 400으로 막는다.
     */
    public record RoutineCreateRequest(
            @NotNull(message = "생성 경로를 선택해주세요.")
            RoutineSourceType sourceType,

            /** 경로 A 전용. 서랍에 저장한 결과의 {@code resultId}. */
            UUID sourceAnalysisResultId,

            /** 경로 B 전용. 카테고리 1~3개. */
            @Valid
            @Size(max = 3, message = "카테고리는 3개까지 고를 수 있어요.")
            List<RoutineItem> items,

            @NotNull(message = "시작일을 선택해주세요.")
            LocalDate startDate) {

        @AssertTrue(message = "저장된 분석 결과를 선택해주세요.")
        public boolean isAnalysisSourceValid() {
            return sourceType != RoutineSourceType.FROM_ANALYSIS || sourceAnalysisResultId != null;
        }

        @AssertTrue(message = "카테고리를 1개 이상 골라주세요.")
        public boolean isStandaloneSourceValid() {
            return sourceType != RoutineSourceType.STANDALONE || (items != null && !items.isEmpty());
        }

        /**
         * 카테고리별 최소 기간. (RoutinePolicy)
         *
         * <p>화면에서도 최소 미만은 고를 수 없게 막지만, 그것만 믿지 않는다.
         * 하한을 두는 이유가 "너무 짧으면 변화가 안 보인다"는 제품 판단이라
         * 클라이언트를 우회한 요청까지 막아야 의미가 있다.
         */
        @AssertTrue(message = "카테고리마다 정해진 최소 기간이 있어요.")
        public boolean isDurationAboveMinimum() {
            if (sourceType != RoutineSourceType.STANDALONE || items == null) {
                return true;
            }
            return items.stream().allMatch(item ->
                    item == null || item.category() == null || item.durationWeeks() == null
                            || item.durationWeeks() >= RoutinePolicy.minWeeks(item.category()));
        }
    }

    public record RoutineItem(
            @NotNull(message = "카테고리를 선택해주세요.")
            Category category,

            @NotNull(message = "기간을 선택해주세요.")
            @Min(value = 1, message = "1주 이상으로 정해주세요.")
            @Max(value = RoutinePolicy.MAX_WEEKS, message = "52주(12개월) 이하로 정해주세요.")
            Integer durationWeeks) {
    }

    /** {@code 201}. <b>항상 배열이다.</b> 경로 B는 최대 3개가 한 번에 생성된다. (API.md C-15) */
    public record RoutineCreateResponse(List<RoutineSummary> routines) {
    }

    /** 경로 A는 {@code category}·{@code durationWeeks}·{@code endDate}가 null이다. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record RoutineSummary(
            UUID routineId,
            RoutineSourceType sourceType,
            Category category,
            String title,
            Short durationWeeks,
            LocalDate startDate,
            LocalDate endDate,
            long taskCount) {
    }

    // ------------------------------------------------------------ GET /routines

    /**
     * 목록.
     *
     * <p>API.md §5는 이 엔드포인트를 목록에만 올려두고 응답 모양을 정의하지 않았다.
     * 새 계약을 만들지 않으려고 {@code POST /routines}의 항목 모양을 그대로 쓴다.
     */
    public record RoutineListResponse(List<RoutineSummary> items) {
    }

    // ------------------------------------------------------------ GET /routines/{id}

    /** {@code sourceType=STANDALONE}이면 {@code overview}가 null이다. (API.md §6.6) */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record RoutineDetailResponse(
            UUID routineId,
            RoutineSourceType sourceType,
            Category category,
            Short durationWeeks,
            String title,
            OffsetDateTime analyzedAt,
            RoutineOverview overview,
            Progress progress,
            List<TaskView> tasks,
            NotificationView notification) {
    }

    /** 고점 요약 카드. 경로 A에서만 채워진다. */
    public record RoutineOverview(
            List<OverviewKeywordView> keywords,
            List<String> keepPoints,
            List<String> emphasizePoints,
            List<String> changeIntensity) {
    }

    public record OverviewKeywordView(UUID id, String label) {
    }

    public record Progress(long done, long total, double rate) {
    }

    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record TaskView(
            UUID taskId,
            Category category,
            String title,
            String timing,
            String durationLabel,
            String amountLabel,
            LocalDate scheduledDate,
            TaskStatus status) {
    }

    /**
     * 시안 23의 알림 토글. 설정 행이 없으면 문서상 기본값을 내려준다. (API.md §6.7)
     *
     * <p>{@code @JsonFormat}이 없으면 {@code LocalTime}이 {@code "21:00:00"}으로
     * 직렬화된다. API.md는 {@code "21:00"}으로 계약했고, 프론트가 그대로 화면에
     * 찍는 값이라 초가 붙으면 시안과 어긋난다.
     */
    public record NotificationView(
            boolean enabled,
            @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "HH:mm") LocalTime time) {
    }

    // ------------------------------------------------------------ PATCH /routine-tasks/{id}

    public record TaskUpdateRequest(
            @NotNull(message = "상태를 지정해주세요.")
            TaskStatus status) {
    }

    public record TaskUpdateResponse(UUID taskId, TaskStatus status, Progress progress) {
    }
}
