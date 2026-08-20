package com.gojeom.routine;

import static org.assertj.core.api.Assertions.assertThat;

import com.gojeom.ai.dto.AiPayloads.PlannedTask;
import com.gojeom.common.enums.Category;
import com.gojeom.common.enums.RoutineImportance;
import com.gojeom.routine.TaskScheduleExpander.Slot;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 일정 펼치기. (V15)
 *
 * <p><b>예전에는 주 단위로 한 행씩만 놓였다.</b> "매일"이라고 써 놓고 4주에 체크박스가
 * 4개였고 "주 3회"라고 써 놓고도 4개였다 — 표기와 일정이 어긋나 있었다.
 *
 * <p>여기가 틀리면 사용자가 보는 달력 전체가 틀린다.
 */
class TaskScheduleExpanderTest {

    private static final LocalDate WED = LocalDate.of(2026, 8, 19);   // 수요일

    private static PlannedTask task(String title, Integer perWeek) {
        // 중요도·근거는 이 테스트의 관심사가 아니다. 펼치기 대상이 되도록 CORE 로 둔다.
        return new PlannedTask(Category.BODY, RoutineImportance.CORE, null,
                title, "매일 아침", null, "15회", perWeek, null, null);
    }

    @Test
    @DisplayName("매일 하는 일은 기간의 모든 날에 놓인다")
    void 매일() {
        List<Slot> slots = TaskScheduleExpander.expand(List.of(task("스쿼트 하기", 7)), WED, 4);

        assertThat(slots).hasSize(4 * 7);
        assertThat(slots.stream().map(Slot::date).distinct()).hasSize(28);
        // 매일 하는 일에는 주간 목표를 두지 않는다. 그날 하면 그날 끝이다.
        assertThat(slots).allSatisfy(slot -> assertThat(slot.weeklyTarget()).isNull());
    }

    @Test
    @DisplayName("주 3회도 그 주의 모든 날에 놓이고, 목표 횟수를 함께 싣는다")
    void 주3회() {
        // 서버가 월·수·금으로 정해 주면 그날 못 한 사람은 회차를 영영 잃는다.
        // 어느 날 할지는 사용자가 그 주 안에서 고른다.
        List<Slot> slots = TaskScheduleExpander.expand(List.of(task("플랭크 버티기", 3)), WED, 2);

        assertThat(slots).hasSize(2 * 7);
        assertThat(slots).allSatisfy(slot -> assertThat(slot.weeklyTarget()).isEqualTo(3));
    }

    @Test
    @DisplayName("주의 경계는 ISO 월요일이 아니라 목표 시작일이다")
    void 주의_경계() {
        // 수요일에 시작한 목표를 월요일로 끊으면 첫 주가 5일뿐이라
        // 그 주만 "주 3회"를 채우기 어려워진다.
        List<Slot> slots = TaskScheduleExpander.expand(List.of(task("스쿼트 하기", 3)), WED, 3);

        assertThat(slots.stream().map(Slot::weekStart).distinct())
                .containsExactly(WED, WED.plusWeeks(1), WED.plusWeeks(2));
        // 어느 주든 정확히 7일이다.
        for (LocalDate weekStart : List.of(WED, WED.plusWeeks(1), WED.plusWeeks(2))) {
            assertThat(slots.stream().filter(s -> s.weekStart().equals(weekStart))).hasSize(7);
        }
    }

    @Test
    @DisplayName("태스크가 여럿이면 날마다 모두 놓인다")
    void 여러_태스크() {
        List<Slot> slots = TaskScheduleExpander.expand(
                List.of(task("스쿼트 하기", 7), task("플랭크 버티기", 3)), WED, 1);

        assertThat(slots).hasSize(2 * 7);
        assertThat(slots.stream().filter(s -> s.task().title().equals("플랭크 버티기")))
                .allSatisfy(slot -> assertThat(slot.weeklyTarget()).isEqualTo(3));
        assertThat(slots.stream().filter(s -> s.task().title().equals("스쿼트 하기")))
                .allSatisfy(slot -> assertThat(slot.weeklyTarget()).isNull());
    }

    @Test
    @DisplayName("빈도가 비었거나 이상하면 매일로 본다")
    void 빈도가_이상하면_매일() {
        // 덜 배정하는 쪽이 더 나쁘다 — 하라고 한 일이 달력에서 사라진다.
        for (Integer bad : new Integer[]{null, 0, -1, 99}) {
            List<Slot> slots = TaskScheduleExpander.expand(List.of(task("물 마시기", bad)), WED, 1);

            assertThat(slots).as("빈도 %s", bad).hasSize(7);
            assertThat(slots).allSatisfy(slot -> assertThat(slot.weeklyTarget()).isNull());
        }
    }

    @Test
    @DisplayName("기간이 없으면 아무것도 만들지 않는다")
    void 기간이_없으면() {
        // 끝이 없는 목표는 달력에 그릴 수 없다. (V15가 경로 A에도 기간을 준 이유)
        assertThat(TaskScheduleExpander.expand(List.of(task("스쿼트 하기", 7)), WED, 0)).isEmpty();
        assertThat(TaskScheduleExpander.expand(List.of(), WED, 4)).isEmpty();
    }

    @Test
    @DisplayName("마지막 날은 시작일 + 기간 - 하루다")
    void 종료일() {
        // plusWeeks(weeks)로 적으면 하루가 더 붙어 달력에 빈 날이 하나 생긴다.
        assertThat(TaskScheduleExpander.endDateOf(WED, 4)).isEqualTo(LocalDate.of(2026, 9, 15));
        assertThat(TaskScheduleExpander.endDateOf(WED, 1)).isEqualTo(WED.plusDays(6));
    }

    @Test
    @DisplayName("펼친 마지막 날이 종료일과 맞는다")
    void 마지막_날이_맞는다() {
        List<Slot> slots = TaskScheduleExpander.expand(List.of(task("스쿼트 하기", 7)), WED, 6);

        LocalDate last = slots.stream().map(Slot::date).max(LocalDate::compareTo).orElseThrow();
        assertThat(last).isEqualTo(TaskScheduleExpander.endDateOf(WED, 6));
    }
}
