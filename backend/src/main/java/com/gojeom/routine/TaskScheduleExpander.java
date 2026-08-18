package com.gojeom.routine;

import com.gojeom.ai.dto.AiPayloads.PlannedTask;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * AI가 만든 한 주치 구성을 <b>기간 안의 날짜로 펼친다.</b> (V15)
 *
 * <p><b>예전에는 주 단위로 한 행씩만 놓였다.</b> 그래서 "매일"이라고 써 놓고 4주에
 * 체크박스가 4개였고, "주 3회"라고 써 놓고도 4개였다. 체크박스의 뜻이 빈도와 무관하게
 * "이번 주에 이거 했나" 하나뿐이라, 표기와 일정이 어긋나 있었다.
 *
 * <p>이제 <b>날마다 한 행</b>이다. 캘린더에서 하루하루가 채워지고 홈은 그날 것만 본다.
 *
 * <h2>주 N회를 다루는 방식</h2>
 * 주 3회짜리도 <b>그 주의 모든 날에 행을 만든다.</b> 대신 {@code weeklyTarget}에 3을
 * 실어, 그 주에 3개를 체크하면 채워진 것으로 센다.
 *
 * <p><b>서버가 요일을 정해 주지 않는 이유</b> — 월·수·금으로 박아 두면 월요일에 못 한
 * 사람은 그 회차를 영영 잃는다. 어느 날 할지는 사용자가 그 주 안에서 고른다.
 *
 * <h2>주의 경계</h2>
 * ISO 월요일이 아니라 <b>목표 시작일 기준</b>으로 7일씩 끊는다. 수요일에 시작한 목표를
 * 월요일로 끊으면 첫 주가 5일밖에 없어, 그 주만 "주 3회"를 채우기 어려워진다.
 */
public final class TaskScheduleExpander {

    /** 하루치 배정 한 건. */
    public record Slot(PlannedTask task, LocalDate date, LocalDate weekStart, Integer weeklyTarget) {
    }

    private static final int DAYS_PER_WEEK = 7;

    private TaskScheduleExpander() {
    }

    /**
     * @param weeks 목표 기간. 0 이하면 빈 목록이다 — 기간 없는 목표를 만들지 않는다
     * @return 태스크 × 기간의 모든 날. 날짜 오름차순, 같은 날 안에서는 입력 순서
     */
    public static List<Slot> expand(List<PlannedTask> tasks, LocalDate startDate, int weeks) {
        List<Slot> slots = new ArrayList<>();
        if (tasks == null || tasks.isEmpty() || weeks <= 0) {
            return slots;
        }

        for (int week = 0; week < weeks; week++) {
            LocalDate weekStart = startDate.plusWeeks(week);
            for (int day = 0; day < DAYS_PER_WEEK; day++) {
                LocalDate date = weekStart.plusDays(day);
                for (PlannedTask task : tasks) {
                    int perWeek = task.weeklyCount();
                    // 매일 하는 것은 목표 횟수를 두지 않는다. 그날 하면 그날 끝이다.
                    Integer target = perWeek >= DAYS_PER_WEEK ? null : perWeek;
                    slots.add(new Slot(task, date, weekStart, target));
                }
            }
        }
        return slots;
    }

    /**
     * 목표의 마지막 날. {@code end_date}로 저장하고 캘린더 범위로도 쓴다.
     *
     * <p>시작일이 첫날이므로 <b>{@code weeks * 7 - 1}일 뒤</b>가 마지막이다.
     * {@code plusWeeks(weeks)}로 적으면 하루가 더 붙는다.
     */
    public static LocalDate endDateOf(LocalDate startDate, int weeks) {
        return startDate.plusWeeks(weeks).minusDays(1);
    }
}
