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
    PRODUCT_RECOMMENDATION
}
