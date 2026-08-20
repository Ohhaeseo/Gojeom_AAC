package com.gojeom.ai;

import static org.assertj.core.api.Assertions.assertThat;

import com.gojeom.common.config.OpenAiProperties.Model;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 어느 단계가 상위 모델을 쓰는지. (②)
 *
 * <p>판정이 {@link AiStage}에 있어야 하는 이유 — 실제로 호출하는 {@code OpenAiClient}와,
 * 어떤 모델이 만든 요약인지 기록하는 {@code ProfileAnalysisPipeline}이 <b>같은 답</b>을
 * 봐야 한다. 둘이 갈라지면 {@code analysis_summary.modelVersion}이 실제 호출과 어긋나고,
 * 나중에 "이 요약을 뭐가 만들었지"를 되짚을 수 없게 된다.
 */
class VisionModelSelectionTest {

    @Test
    @DisplayName("얼굴 사진을 읽는 단계만 상위 모델을 쓴다")
    void 프로필_분석만_비전_모델이다() {
        assertThat(AiStage.PROFILE_ANALYSIS.usesVisionModel()).isTrue();

        // 나머지는 텍스트 전용이거나(결과 생성) 분위기만 읽는다(키워드 추출).
        // 올려도 값어치가 없는데 분석 1건마다 비용이 붙는다.
        for (AiStage stage : AiStage.values()) {
            if (stage != AiStage.PROFILE_ANALYSIS) {
                assertThat(stage.usesVisionModel())
                        .as("%s는 상위 모델을 쓰지 않는다", stage)
                        .isFalse();
            }
        }
    }

    @Test
    @DisplayName("vision이 설정돼 있으면 그 모델을 쓴다")
    void vision을_쓴다() {
        Model model = new Model("gpt-text-mini", "gpt-vision", "gpt-image-1");

        assertThat(model.resolve(true)).isEqualTo("gpt-vision");
        assertThat(model.resolve(false)).isEqualTo("gpt-text-mini");
    }

    @Test
    @DisplayName("vision이 비어 있으면 text로 떨어진다 — 설정 하나에 분석 전체가 멈추지 않는다")
    void vision이_없으면_text로_떨어진다() {
        // 배포 환경에 OPENAI_MODEL_VISION을 넣지 않은 경우다. 지금까지와 똑같이 돌아야 한다.
        assertThat(new Model("gpt-text-mini", null, "gpt-image-1").resolve(true)).isEqualTo("gpt-text-mini");
        assertThat(new Model("gpt-text-mini", "", "gpt-image-1").resolve(true)).isEqualTo("gpt-text-mini");
        assertThat(new Model("gpt-text-mini", "   ", "gpt-image-1").resolve(true)).isEqualTo("gpt-text-mini");
    }
}
