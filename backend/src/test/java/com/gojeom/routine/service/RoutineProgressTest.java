package com.gojeom.routine.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.gojeom.common.enums.Category;
import com.gojeom.common.enums.ProblemCode;
import com.gojeom.common.enums.RoutineImportance;
import com.gojeom.common.enums.TaskStatus;
import com.gojeom.routine.dto.RoutineDtos.Progress;
import com.gojeom.routine.entity.RoutineTask;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 진행률. 🔴 <b>사용자가 할 수 있는 것을 전부 해도 바가 꽉 차지 않던 자리다.</b>
 *
 * <p>두 가지가 겹쳤다. 주 N회는 그 주 <b>모든 날</b>에 행이 있어 행으로 세면 3/7이고,
 * {@code OPTIONAL}은 날짜로 펼쳐지지 않아 <b>화면에 체크할 자리조차 없는데</b>
 * 분모에 들어 있었다. {@code lib/tasks.ts}의 {@code routineProgress}와 같은 규칙이다.
 */
class RoutineProgressTest {

    private static final UUID ROUTINE = UUID.randomUUID();
    private static final LocalDate WEEK = LocalDate.of(2026, 8, 19);

    private static RoutineTask task(String title, RoutineImportance importance,
                                    Integer weeklyTarget, TaskStatus status) {
        RoutineTask task = RoutineTask.of(ROUTINE, Category.BODY, title, "저녁", null, null,
                WEEK, WEEK, weeklyTarget,
                new RoutineTask.Detail(importance, ProblemCode.LOW_ACTIVITY, null, null));
        task.changeStatus(status);
        return task;
    }

    private static List<RoutineTask> repeat(int count, String title, Integer weeklyTarget,
                                            TaskStatus status) {
        List<RoutineTask> tasks = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            tasks.add(task(title, RoutineImportance.CORE, weeklyTarget, status));
        }
        return tasks;
    }

    /** 🔴 주 3회를 세 번 하면 그 주는 끝이다. 남은 4일은 화면에서도 사라진다. */
    @Test
    @DisplayName("주 N회는 행이 아니라 목표 횟수로 센다")
    void 주N회는_목표_횟수로_센다() {
        List<RoutineTask> tasks = new ArrayList<>(repeat(3, "플랭크 버티기", 3, TaskStatus.DONE));
        tasks.addAll(repeat(4, "플랭크 버티기", 3, TaskStatus.PENDING));

        Progress progress = RoutineService.progressOf(tasks);

        assertThat(progress.done()).isEqualTo(3);
        assertThat(progress.total()).isEqualTo(3);
        assertThat(progress.rate()).isEqualTo(100.0);
    }

    /** 🔴 "해보면 좋은 것"에는 체크박스가 없다. 분모에 두면 영원히 미완이다. */
    @Test
    @DisplayName("선택 항목은 분모에서 뺀다")
    void 선택_항목은_세지_않는다() {
        List<RoutineTask> tasks = List.of(
                task("세안하기", RoutineImportance.CORE, null, TaskStatus.DONE),
                task("주간 사진 찍기", RoutineImportance.OPTIONAL, null, TaskStatus.PENDING));

        Progress progress = RoutineService.progressOf(tasks);

        assertThat(progress.done()).isEqualTo(1);
        assertThat(progress.total()).isEqualTo(1);
        assertThat(progress.rate()).isEqualTo(100.0);
    }

    @Test
    @DisplayName("네 번째를 더 체크해도 100%를 넘지 않는다")
    void 초과_체크는_상한에_걸린다() {
        Progress progress = RoutineService.progressOf(repeat(4, "플랭크 버티기", 3, TaskStatus.DONE));

        assertThat(progress.done()).isEqualTo(3);
        assertThat(progress.rate()).isEqualTo(100.0);
    }

    @Test
    @DisplayName("매일 하는 일은 행 하나가 한 번이다")
    void 매일은_행_하나가_한_번이다() {
        List<RoutineTask> tasks = List.of(
                task("세안하기", RoutineImportance.CORE, null, TaskStatus.DONE),
                task("보습하기", RoutineImportance.SUPPORT, null, TaskStatus.PENDING));

        Progress progress = RoutineService.progressOf(tasks);

        assertThat(progress.done()).isEqualTo(1);
        assertThat(progress.total()).isEqualTo(2);
        assertThat(progress.rate()).isEqualTo(50.0);
    }

    @Test
    @DisplayName("선택 항목만 있으면 셀 것이 없다")
    void 선택_항목만_있으면_0이다() {
        Progress progress = RoutineService.progressOf(
                List.of(task("주간 사진 찍기", RoutineImportance.OPTIONAL, null, TaskStatus.PENDING)));

        assertThat(progress.total()).isZero();
        assertThat(progress.rate()).isZero();
    }
}
