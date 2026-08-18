package com.gojeom.ai;

/**
 * AI 호출 단계. {@code ai_jobs.stage}에 그대로 기록된다. (ERD.md §3.10 · PRD §8.1)
 *
 * <p>{@code PROFILE_ANALYSIS}와 {@code INBODY_OCR}은 분석에 속하지 않으므로
 * {@code ai_jobs.analysis_id}가 NULL이다.
 */
public enum AiStage {

    PROFILE_ANALYSIS,
    INBODY_OCR,
    KEYWORD_EXTRACTION,
    RESULT_GENERATION,
    IMAGE_GENERATION,
    ROUTINE_GENERATION,

    /** 분석 결과 → 어울리는 상품 고르기. 분석에 속하므로 analysis_id가 있다. */
    PRODUCT_RECOMMENDATION;

    /**
     * {@code openai.model.vision}(상위 모델)을 쓰는 단계인지. (②)
     *
     * <p><b>판정이 여기 있는 이유</b> — 실제로 호출하는 {@link OpenAiClient}와,
     * 어떤 모델이 만든 요약인지 기록하는 {@code ProfileAnalysisPipeline}이 같은 답을
     * 봐야 한다. 양쪽이 따로 정하면 {@code modelVersion}이 실제 호출과 어긋난다.
     *
     * <p>얼굴 사진 한 장을 얼마나 세밀하게 읽느냐가 뒤따르는 모든 단계의 상한이 된다 —
     * 키워드 추출도 결과 생성도 사진을 다시 보지 않고 이 단계의 요약만 넘겨받는다.
     * 반대로 나머지 단계는 텍스트 전용이거나 분위기만 읽어서 모델을 올려도 값어치가 없다.
     *
     * <p>프로필당 1회 호출이라 분석 1건당 비용은 늘지 않는다.
     */
    public boolean usesVisionModel() {
        return this == PROFILE_ANALYSIS;
    }
}
