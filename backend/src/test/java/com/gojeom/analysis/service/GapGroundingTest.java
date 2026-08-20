package com.gojeom.analysis.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.gojeom.ai.dto.AiPayloads.CategoryChangePayload;
import com.gojeom.ai.dto.AiPayloads.DailyCarePayload;
import com.gojeom.ai.dto.AiPayloads.GapItemPayload;
import com.gojeom.ai.dto.AiPayloads.PeakResult;
import com.gojeom.analysis.entity.GapItem;
import com.gojeom.common.enums.Category;
import com.gojeom.common.enums.EvidenceSource;
import com.gojeom.common.enums.ProblemCode;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 분석이 짚은 문제를 <b>실제로 있었던 근거만 남기고</b> 거르는 규칙. (루틴 고도화 2단계)
 *
 * <p>🔴 <b>어떤 입력이 와도 던지지 않는다.</b> 여기서 던지면 결과지 본문이 멀쩡한데도
 * 분석이 통째로 실패한다 — 8/20 오후에 루틴 생성에서 똑같은 방식으로 운영이 막혔다.
 * 목록이 비면 목표 생성이 전체 문제 코드로 되돌아갈 뿐, 사용자가 잃는 것은 없다.
 */
class GapGroundingTest {

    private static final List<Category> PRIORITIES =
            List.of(Category.HEALTH, Category.SKIN, Category.BODY);

    private static final Set<EvidenceSource> AVAILABLE = Set.of(
            EvidenceSource.USER_INPUT_TEXT, EvidenceSource.SELECTED_KEYWORDS,
            EvidenceSource.HEIGHT_WEIGHT, EvidenceSource.SLEEP_HOURS);

    private static PeakResult result(GapItemPayload... gaps) {
        return new PeakResult("제목", "요약", List.of("유지"), List.of("강조"), List.of("은은한 변화"),
                List.of(new CategoryChangePayload(Category.SKIN, "설명")),
                List.of(new DailyCarePayload("관리", "설명")),
                List.of(gaps));
    }

    private static GapItemPayload gap(Category category, ProblemCode code, EvidenceSource source) {
        return new GapItemPayload(category, code, source, "근거 한 줄");
    }

    /** 🔴 2단계의 핵심 후검증이다. */
    @Test
    @DisplayName("받은 적 없는 것을 근거로 대면 그 항목을 버린다")
    void 없는_근거는_버린다() {
        List<GapItem> grounded = AnalysisPipeline.groundGapItems(result(
                gap(Category.HEALTH, ProblemCode.SLEEP_IRREGULARITY, EvidenceSource.SLEEP_HOURS),
                gap(Category.BODY, ProblemCode.BODY_FAT_MANAGEMENT, EvidenceSource.INBODY_BODY_FAT)),
                AVAILABLE, PRIORITIES);

        assertThat(grounded).hasSize(1);
        assertThat(grounded.get(0).problemCode()).isEqualTo(ProblemCode.SLEEP_IRREGULARITY);
    }

    /**
     * 태스크와 달리 <b>항목을 통째로 버린다.</b> 태스크는 코드를 지워도 할 일이 남지만,
     * gapItem은 코드와 근거가 전부라 남길 알맹이가 없다.
     */
    @Test
    @DisplayName("문제 코드가 다른 카테고리 것이면 항목을 버린다")
    void 어긋난_코드는_항목째_버린다() {
        List<GapItem> grounded = AnalysisPipeline.groundGapItems(result(
                gap(Category.BODY, ProblemCode.RECOVERY_GAP, EvidenceSource.HEIGHT_WEIGHT)),
                AVAILABLE, PRIORITIES);

        assertThat(grounded).isEmpty();
    }

    @Test
    @DisplayName("같은 문제를 두 번 짚으면 뒤엣것을 버린다")
    void 중복은_한_번만_남긴다() {
        List<GapItem> grounded = AnalysisPipeline.groundGapItems(result(
                gap(Category.SKIN, ProblemCode.DEHYDRATION_TENDENCY, EvidenceSource.USER_INPUT_TEXT),
                gap(Category.SKIN, ProblemCode.DEHYDRATION_TENDENCY, EvidenceSource.SELECTED_KEYWORDS)),
                AVAILABLE, PRIORITIES);

        assertThat(grounded).hasSize(1);
        assertThat(grounded.get(0).evidenceSource()).isEqualTo(EvidenceSource.USER_INPUT_TEXT);
    }

    /**
     * 순서는 {@code profiles.priorities}를 따르고, 같은 카테고리 안에서는 모델이 낸
     * 순서를 그대로 둔다. 프롬프트가 "중요한 것부터 앞에 쓰라"고 요구한 그 순서다.
     */
    @Test
    @DisplayName("우선순위 순으로 매기고, 같은 카테고리 안에서는 낸 순서를 지킨다")
    void 우선순위로_순서를_매긴다() {
        List<GapItem> grounded = AnalysisPipeline.groundGapItems(result(
                gap(Category.SKIN, ProblemCode.UV_CARE_GAP, EvidenceSource.USER_INPUT_TEXT),
                gap(Category.SKIN, ProblemCode.DEHYDRATION_TENDENCY, EvidenceSource.SELECTED_KEYWORDS),
                gap(Category.HEALTH, ProblemCode.SLEEP_IRREGULARITY, EvidenceSource.SLEEP_HOURS)),
                AVAILABLE, PRIORITIES);

        // 1순위가 HEALTH 라 건강이 맨 앞으로 온다.
        assertThat(grounded).extracting(GapItem::problemCode).containsExactly(
                ProblemCode.SLEEP_IRREGULARITY, ProblemCode.UV_CARE_GAP, ProblemCode.DEHYDRATION_TENDENCY);
        assertThat(grounded).extracting(GapItem::priority).containsExactly(1, 2, 3);
    }

    /** 🔴 무엇이 와도 던지지 않는다. 목록이 비면 목표 생성이 예전처럼 동작할 뿐이다. */
    @Test
    @DisplayName("값이 비어 있어도 던지지 않는다")
    void 비어도_던지지_않는다() {
        assertThat(AnalysisPipeline.groundGapItems(result(), AVAILABLE, PRIORITIES)).isEmpty();

        assertThat(AnalysisPipeline.groundGapItems(result(
                new GapItemPayload(null, null, null, null),
                new GapItemPayload(Category.SKIN, ProblemCode.UV_CARE_GAP,
                        EvidenceSource.USER_INPUT_TEXT, "   ")),
                AVAILABLE, PRIORITIES)).isEmpty();
    }
}
