package com.gojeom.routine.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.gojeom.analysis.entity.GapItem;
import com.gojeom.common.enums.Category;
import com.gojeom.common.enums.EvidenceSource;
import com.gojeom.common.enums.ProblemCode;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 태스크가 고를 수 있는 문제 코드를 <b>분석이 짚은 것으로 좁힌다.</b> (루틴 고도화 2단계)
 *
 * <p>🔴 <b>좁히다가 막아 버리면 안 된다.</b> 카테고리 하나에 고를 코드가 없으면 모델은
 * 그 카테고리 태스크를 아예 만들 수 없다 — 스키마가 막기 때문이다. 그래서
 * <b>비어 있는 카테고리만</b> 전체 목록으로 되돌린다.
 */
class AllowedProblemCodesTest {

    private static GapItem gap(Category category, ProblemCode code) {
        return new GapItem(category, code, 1, EvidenceSource.USER_INPUT_TEXT, "근거");
    }

    /** V17 이전 결과지다. 지금까지와 똑같이 동작해야 한다. */
    @Test
    @DisplayName("문제 목록이 비면 전체 코드를 그대로 쓴다")
    void 목록이_비면_좁히지_않는다() {
        Set<ProblemCode> allowed = RoutineService.allowedCodes(List.of());

        assertThat(allowed).containsExactlyInAnyOrder(ProblemCode.values());
    }

    @Test
    @DisplayName("짚은 카테고리는 그 코드로 좁힌다")
    void 짚은_카테고리는_좁아진다() {
        Set<ProblemCode> allowed = RoutineService.allowedCodes(List.of(
                gap(Category.SKIN, ProblemCode.DEHYDRATION_TENDENCY),
                gap(Category.BODY, ProblemCode.LOW_ACTIVITY),
                gap(Category.HEALTH, ProblemCode.SLEEP_IRREGULARITY)));

        assertThat(allowed).containsExactlyInAnyOrder(
                ProblemCode.DEHYDRATION_TENDENCY, ProblemCode.LOW_ACTIVITY,
                ProblemCode.SLEEP_IRREGULARITY);
    }

    /** 🔴 좁히기가 막기가 되는 지점이다. */
    @Test
    @DisplayName("짚지 않은 카테고리만 전체 목록으로 되돌린다")
    void 빈_카테고리는_전체로_되돌린다() {
        Set<ProblemCode> allowed = RoutineService.allowedCodes(List.of(
                gap(Category.SKIN, ProblemCode.UV_CARE_GAP)));

        assertThat(allowed).contains(ProblemCode.UV_CARE_GAP);
        // 피부는 짚은 하나로 좁고, 체형·건강은 그대로 넓다.
        assertThat(allowed).doesNotContain(ProblemCode.DEHYDRATION_TENDENCY);
        assertThat(allowed).containsAll(ProblemCode.of(Category.BODY));
        assertThat(allowed).containsAll(ProblemCode.of(Category.HEALTH));
    }

    @Test
    @DisplayName("한 카테고리를 여러 번 짚으면 모두 고를 수 있다")
    void 여러_번_짚으면_모두_넣는다() {
        Set<ProblemCode> allowed = RoutineService.allowedCodes(List.of(
                gap(Category.BODY, ProblemCode.LOW_ACTIVITY),
                gap(Category.BODY, ProblemCode.MUSCLE_DEVELOPMENT)));

        assertThat(allowed).contains(ProblemCode.LOW_ACTIVITY, ProblemCode.MUSCLE_DEVELOPMENT);
        assertThat(allowed).doesNotContain(ProblemCode.POSTURE_BALANCE);
    }
}
