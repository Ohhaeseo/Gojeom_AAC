package com.gojeom.routine;

import static org.assertj.core.api.Assertions.assertThat;

import com.gojeom.ai.dto.AiPayloads.PlannedTask;
import com.gojeom.common.enums.Category;
import com.gojeom.common.enums.ProblemCode;
import com.gojeom.common.enums.RoutineImportance;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 🔴 <b>{@code OPTIONAL}은 날짜로 펼치지 않는다.</b>
 *
 * <p>V15가 태스크를 기간 안의 <b>모든 날</b>로 펼치므로, 52주 목표에서는 태스크 하나가
 * 364행이 된다. 선택 항목까지 펼치면 목표 하나가 4천 행을 넘긴다.
 * (docs/ROUTINE_UPGRADE_PLAN.md §2)
 *
 * <p>이 테스트가 없으면 <b>행이 두 배가 된 뒤에</b> 알게 된다.
 */
class TaskScheduleExpanderImportanceTest {

    private static final LocalDate START = LocalDate.of(2026, 8, 20);

    private static PlannedTask task(String title, RoutineImportance importance, int perWeek) {
        return new PlannedTask(Category.BODY, importance, ProblemCode.MUSCLE_DEVELOPMENT,
                title, "저녁", null, "15회", perWeek, "근거", "기대 효과");
    }

    @Test
    @DisplayName("OPTIONAL 은 날짜로 펼쳐지지 않는다")
    void 선택은_펼치지_않는다() {
        List<PlannedTask> tasks = List.of(
                task("스쿼트 하기", RoutineImportance.CORE, 7),
                task("계단 오르기", RoutineImportance.SUPPORT, 7),
                task("주간 사진 찍기", RoutineImportance.OPTIONAL, 7));

        var slots = TaskScheduleExpander.expand(tasks, START, 2);

        // 2주 × 7일 × (CORE + SUPPORT) = 28. 선택은 한 건도 없다.
        assertThat(slots).hasSize(28);
        assertThat(slots).noneMatch(s -> s.task().title().equals("주간 사진 찍기"));
    }

    @Test
    @DisplayName("펼치지 않은 것은 따로 꺼낼 수 있다 — 버리는 것이 아니다")
    void 선택은_따로_꺼낸다() {
        List<PlannedTask> tasks = List.of(
                task("스쿼트 하기", RoutineImportance.CORE, 3),
                task("주간 사진 찍기", RoutineImportance.OPTIONAL, 1));

        assertThat(TaskScheduleExpander.unscheduled(tasks))
                .extracting(PlannedTask::title)
                .containsExactly("주간 사진 찍기");
    }

    /** 값이 없는 응답이 와도 화면에서 사라지면 안 된다. */
    @Test
    @DisplayName("importance 가 null 이면 CORE 로 보고 펼친다")
    void null이면_필수로_본다() {
        PlannedTask noImportance = new PlannedTask(Category.SKIN, null, null,
                "미온수로 세안하기", "아침", null, null, 7, "근거", null);

        assertThat(TaskScheduleExpander.expand(List.of(noImportance), START, 1)).hasSize(7);
        assertThat(TaskScheduleExpander.unscheduled(List.of(noImportance))).isEmpty();
    }

    /** 52주 × 태스크 10개면 얼마나 되는지 — 상한을 눈으로 확인해 둔다. */
    @Test
    @DisplayName("선택을 빼면 행 수가 눈에 띄게 준다")
    void 행_수를_재둔다() {
        List<PlannedTask> tasks = List.of(
                task("A", RoutineImportance.CORE, 7),
                task("B", RoutineImportance.CORE, 7),
                task("C", RoutineImportance.SUPPORT, 7),
                task("D", RoutineImportance.OPTIONAL, 7),
                task("E", RoutineImportance.OPTIONAL, 7));

        // 52주 × 7일 × 3(CORE·SUPPORT) = 1,092. 5개를 다 펼치면 1,820이었다.
        assertThat(TaskScheduleExpander.expand(tasks, START, 52)).hasSize(1_092);
    }
}
