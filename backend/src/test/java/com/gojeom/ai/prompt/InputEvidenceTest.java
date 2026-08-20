package com.gojeom.ai.prompt;

import static org.assertj.core.api.Assertions.assertThat;

import com.gojeom.common.enums.CaptureReadability;
import com.gojeom.common.enums.EvidenceSource;
import com.gojeom.profile.entity.CaptureQuality;
import com.gojeom.profile.entity.Inbody;
import com.gojeom.profile.entity.ProfileAnalysisSummary;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * <b>이 사용자에게 실제로 있었던 근거</b>만 남는가. (루틴 고도화 2단계)
 *
 * <p>여기가 무너지면 2단계의 후검증이 통째로 무의미해진다 — 서버가 대조할 기준
 * 자체가 틀리기 때문이다. 인바디를 낸 적 없는 사람의 gapItem에 인바디 근거가
 * 붙어도 통과하게 된다.
 */
class InputEvidenceTest {

    private static ProfileAnalysisSummary summary(CaptureReadability readability) {
        return new ProfileAnalysisSummary(List.of("부드러운 인상"), "보통 체형", List.of("수면 부족"),
                readability == null ? null : new CaptureQuality(readability, List.of()),
                "model", "2026-08-20T00:00:00Z");
    }

    /** 고점 문장과 키워드는 결과 생성 단계에 언제나 있다. 아무것도 못 고르면 2단계가 죽는다. */
    @Test
    @DisplayName("아무것도 입력하지 않아도 근거가 비지 않는다")
    void 기본_근거는_언제나_있다() {
        Set<EvidenceSource> available = InputEvidence.of(null, null, null);

        assertThat(available).containsExactlyInAnyOrder(
                EvidenceSource.USER_INPUT_TEXT,
                EvidenceSource.SELECTED_KEYWORDS,
                EvidenceSource.HEIGHT_WEIGHT);
    }

    @Test
    @DisplayName("인바디를 내지 않았으면 인바디를 근거로 쓸 수 없다")
    void 인바디가_없으면_뺀다() {
        Set<EvidenceSource> available = InputEvidence.of(new BigDecimal("5.5"), Inbody.empty(), null);

        assertThat(available).contains(EvidenceSource.SLEEP_HOURS);
        assertThat(available).doesNotContain(
                EvidenceSource.INBODY_BODY_FAT,
                EvidenceSource.INBODY_SKELETAL_MUSCLE,
                EvidenceSource.INBODY_BMI);
    }

    /** 인바디는 항목마다 따로 낸다. 하나 냈다고 나머지까지 근거가 되지 않는다. */
    @Test
    @DisplayName("인바디는 실제로 채운 항목만 근거가 된다")
    void 인바디는_항목별로_본다() {
        Inbody partial = new Inbody(null, null, null, new BigDecimal("18.2"), null, null);

        Set<EvidenceSource> available = InputEvidence.of(null, partial, null);

        assertThat(available).contains(EvidenceSource.INBODY_BODY_FAT);
        assertThat(available).doesNotContain(
                EvidenceSource.INBODY_SKELETAL_MUSCLE, EvidenceSource.INBODY_BMI);
    }

    /** 🔴 ProfileFacts가 말로 하던 규칙을 서버가 실제로 막는 자리다. */
    @Test
    @DisplayName("사진을 제대로 보지 못했으면 얼굴 인상을 근거로 쓸 수 없다")
    void LIMITED면_얼굴을_뺀다() {
        Set<EvidenceSource> available =
                InputEvidence.of(null, null, summary(CaptureReadability.LIMITED));

        assertThat(available).doesNotContain(EvidenceSource.PHOTO_FACE);
        // 체형·건강 메모는 얼굴 판독과 별개다. 프롬프트도 얼굴 인상만 짚어 말린다.
        assertThat(available).contains(EvidenceSource.PHOTO_BODY, EvidenceSource.PHOTO_HEALTH_NOTES);
    }

    @Test
    @DisplayName("사진이 또렷하면 얼굴 인상도 근거가 된다")
    void CLEAR면_얼굴도_쓴다() {
        Set<EvidenceSource> available =
                InputEvidence.of(null, null, summary(CaptureReadability.CLEAR));

        assertThat(available).contains(EvidenceSource.PHOTO_FACE);
    }

    @Test
    @DisplayName("프롬프트 줄은 쓸 수 있는 것만, 선언 순서로 적는다")
    void 프롬프트_줄() {
        String lines = InputEvidence.promptLines(
                Set.of(EvidenceSource.SELECTED_KEYWORDS, EvidenceSource.USER_INPUT_TEXT));

        assertThat(lines).contains("USER_INPUT_TEXT", "SELECTED_KEYWORDS");
        assertThat(lines).doesNotContain("INBODY_BMI");
        assertThat(lines.indexOf("USER_INPUT_TEXT")).isLessThan(lines.indexOf("SELECTED_KEYWORDS"));
    }
}
