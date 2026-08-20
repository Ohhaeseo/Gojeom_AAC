package com.gojeom.routine.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.gojeom.ai.dto.AiPayloads.PlannedTask;
import com.gojeom.common.enums.Category;
import com.gojeom.common.enums.ProblemCode;
import com.gojeom.common.enums.RoutineImportance;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * AI 응답을 <b>저장할 수 있는 모양으로</b> 다듬는 규칙.
 *
 * <p>🔴 <b>운영에서 500이 났던 자리다.</b> 문제 코드가 카테고리와 어긋나면 재생성을
 * 시켰는데, 모델이 두 번 다 같은 답을 내자 루틴 생성이 통째로 막혔다 —
 * 체형 목표의 "가벼운 풀기"에 {@code RECOVERY_GAP}(건강)이 붙었을 뿐인데
 * 사용자는 목표를 하나도 받지 못했다.
 *
 * <p><b>어떤 입력이 와도 던지지 않는다.</b> 라벨이 어긋난 것과 내용이 잘못된 것은 다르다.
 */
class RoutineNormalizeTest {

    private static PlannedTask task(Category category, RoutineImportance importance,
                                    ProblemCode code, String title, String reason) {
        return new PlannedTask(category, importance, code, title, "저녁", null, null, 3, reason, "기대");
    }

    /** 🔴 500을 만든 그 입력이다. */
    @Test
    @DisplayName("문제 코드가 카테고리와 어긋나면 코드만 지우고 태스크는 살린다")
    void 어긋난_코드는_지우고_살린다() {
        List<PlannedTask> out = RoutineService.normalize(List.of(
                task(Category.BODY, RoutineImportance.CORE, ProblemCode.MUSCLE_DEVELOPMENT, "스쿼트 하기", "근거"),
                task(Category.BODY, RoutineImportance.SUPPORT, ProblemCode.RECOVERY_GAP, "가벼운 풀기", "근거")),
                Category.BODY);

        assertThat(out).hasSize(2);
        assertThat(out.get(1).title()).isEqualTo("가벼운 풀기");
        assertThat(out.get(1).problemCode()).isNull();
        assertThat(out.get(0).problemCode()).isEqualTo(ProblemCode.MUSCLE_DEVELOPMENT);
    }

    @Test
    @DisplayName("경로 A는 태스크가 스스로 말한 카테고리로 본다")
    void 강제_카테고리가_없으면_태스크_것을_쓴다() {
        List<PlannedTask> out = RoutineService.normalize(List.of(
                task(Category.HEALTH, RoutineImportance.CORE, ProblemCode.SLEEP_IRREGULARITY, "취침시간 고정", "근거")),
                null);

        assertThat(out.get(0).problemCode()).isEqualTo(ProblemCode.SLEEP_IRREGULARITY);
    }

    /** 스키마의 {@code type: string}은 빈 문자열을 통과시킨다. */
    @Test
    @DisplayName("빈 근거는 없는 것으로 둔다 — 지어 채우지 않는다")
    void 빈_근거는_null이_된다() {
        List<PlannedTask> out = RoutineService.normalize(List.of(
                task(Category.BODY, RoutineImportance.CORE, ProblemCode.LOW_ACTIVITY, "걷기", "   ")),
                Category.BODY);

        assertThat(out.get(0).reason()).isNull();
        assertThat(out.get(0).title()).isEqualTo("걷기");
    }

    @Test
    @DisplayName("CORE 가 하나도 없으면 첫 태스크를 올린다 — 빈 목표를 주지 않는다")
    void CORE가_없으면_첫_태스크를_올린다() {
        List<PlannedTask> out = RoutineService.normalize(List.of(
                task(Category.BODY, RoutineImportance.SUPPORT, ProblemCode.LOW_ACTIVITY, "걷기", "근거"),
                task(Category.BODY, RoutineImportance.OPTIONAL, ProblemCode.POSTURE_BALANCE, "가슴 펴기", "근거")),
                Category.BODY);

        assertThat(out.get(0).importance()).isEqualTo(RoutineImportance.CORE);
        assertThat(out.get(1).importance()).isEqualTo(RoutineImportance.OPTIONAL);
    }

    /**
     * 🔴 <b>운영 화면에 "기상 직후 · null"이 찍혔던 자리다.</b>
     *
     * <p>스키마가 {@code ["string","null"]}이라 <b>글자 {@code "null"}도 통과한다.</b>
     * JSON의 {@code null}과 다른 값인데 스키마는 후자를 막지 않는다.
     */
    @Test
    @DisplayName("값이 아닌 글자는 없는 것으로 만든다 — 화면에 프로그래밍 말이 나가면 안 된다")
    void 값이_아닌_글자는_지운다() {
        List<PlannedTask> out = RoutineService.normalize(List.of(
                new PlannedTask(Category.BODY, RoutineImportance.CORE, ProblemCode.LOW_ACTIVITY,
                        "계단 오르기", "저녁", "null", "N/A", 3, "  ", "없음")),
                Category.BODY);

        assertThat(out.get(0).durationLabel()).isNull();
        assertThat(out.get(0).amountLabel()).isNull();
        assertThat(out.get(0).reason()).isNull();
        assertThat(out.get(0).expectedEffect()).isNull();
        // 태스크 자체는 멀쩡하다. 라벨이 없다고 할 일을 버리지 않는다.
        assertThat(out.get(0).title()).isEqualTo("계단 오르기");
    }

    @Test
    @DisplayName("진짜 분량은 그대로 둔다")
    void 진짜_값은_남긴다() {
        List<PlannedTask> out = RoutineService.normalize(List.of(
                new PlannedTask(Category.BODY, RoutineImportance.CORE, ProblemCode.LOW_ACTIVITY,
                        "스쿼트 하기", "저녁", "약 2분", " 15회 3세트 ", 3, "근거", "기대")),
                Category.BODY);

        assertThat(out.get(0).durationLabel()).isEqualTo("약 2분");
        // 앞뒤 공백은 다듬는다. 화면에서 " · " 앞뒤가 벌어져 보인다.
        assertThat(out.get(0).amountLabel()).isEqualTo("15회 3세트");
    }

    /** 🔴 무엇이 와도 던지지 않아야 한다. 던지면 사용자가 목표를 못 받는다. */
    @Test
    @DisplayName("코드도 근거도 없는 응답에도 던지지 않는다")
    void 값이_비어도_던지지_않는다() {
        List<PlannedTask> out = RoutineService.normalize(List.of(
                new PlannedTask(Category.SKIN, null, null, "세안하기", "아침", null, null, 7, null, null)),
                Category.SKIN);

        assertThat(out).hasSize(1);
        assertThat(out.get(0).importanceOrCore()).isEqualTo(RoutineImportance.CORE);
    }
}
