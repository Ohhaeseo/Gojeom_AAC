package com.gojeom.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * OpenAI 설정. (ARCHITECTURE.md §6.1)
 *
 * <p><b>모델 ID를 코드에 하드코딩하지 않는다.</b> 여기서 핀 고정하고,
 * 실제 사용한 값은 호출마다 {@code ai_jobs.model}에 기록한다.
 */
@ConfigurationProperties(prefix = "openai")
public record OpenAiProperties(
        String apiKey,
        String baseUrl,
        Model model,
        Timeout timeout,
        int maxRetries) {

    /**
     * {@code vision}은 <b>시각 판독이 결과를 가르는 단계</b>에만 쓰는 상위 모델이다.
     * 어느 단계가 그런지는 {@link com.gojeom.ai.OpenAiClient}가 정한다.
     *
     * <p>설정하지 않으면 {@code text}와 같은 값이 들어와 지금과 똑같이 동작한다.
     * 모델을 올리는 결정과 코드 배포를 분리하기 위한 기본값이다.
     */
    public record Model(String text, String vision, String image) {

        /**
         * 쓸 모델 ID. {@code vision}이 비어 있으면 {@code text}로 떨어진다.
         *
         * <p>비어 있다고 예외를 던지지 않는 이유 — 설정 하나가 빠졌다고 분석 전체가
         * 멈추는 것보다, 지금까지와 같은 모델로 도는 편이 낫다. (AGENTS.md 규칙 15)
         *
         * @param useVision {@code AiStage.usesVisionModel()}
         */
        public String resolve(boolean useVision) {
            return useVision && vision != null && !vision.isBlank() ? vision : text;
        }
    }

    public record Timeout(int connectSeconds, int readSeconds) {
    }
}
