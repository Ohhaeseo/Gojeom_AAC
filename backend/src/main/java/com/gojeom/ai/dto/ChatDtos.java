package com.gojeom.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Locale;

/**
 * OpenAI {@code /v1/chat/completions} 요청·응답 매핑. (API.md §7.1)
 *
 * <p>필드명이 {@code snake_case}라 레코드 컴포넌트마다 {@code @JsonProperty}를 붙인다.
 * 응답에는 {@code @JsonIgnoreProperties(ignoreUnknown = true)}를 둔다 —
 * 제공자가 필드를 추가해도 파싱이 깨지지 않아야 한다.
 *
 * <p><b>온도·최대 토큰을 보내지 않는다.</b> 모델 세대마다 지원 파라미터가 달라
 * ({@code max_tokens} vs {@code max_completion_tokens}) 모델을 바꾸면 400이 난다.
 * 필수 파라미터만 보내면 모델 핀을 바꿔도 코드가 그대로 동작한다.
 */
public final class ChatDtos {

    private ChatDtos() {
    }

    // ------------------------------------------------------------------ 요청

    public record ChatRequest(
            String model,
            List<Message> messages,
            @JsonProperty("response_format") ResponseFormat responseFormat) {
    }

    /** {@code content}는 시스템 메시지면 String, 사용자 메시지면 파트 배열이다. */
    public record Message(String role, Object content) {

        public static Message system(String text) {
            return new Message("system", text);
        }

        public static Message user(List<Object> parts) {
            return new Message("user", parts);
        }
    }

    public record TextPart(String type, String text) {

        public static TextPart of(String text) {
            return new TextPart("text", text);
        }
    }

    public record ImagePart(String type, @JsonProperty("image_url") ImageUrl imageUrl) {

        /** presigned GET URL을 그대로 넘긴다. 이미지 바이트는 이 서버를 통과하지 않는다. */
        public static ImagePart of(String url, ImageDetail detail) {
            return new ImagePart("image_url", new ImageUrl(url, detail.wireValue()));
        }
    }

    /**
     * {@code detail}은 {@link ImageDetail#AUTO}일 때 null이고, 전역
     * {@code non_null} 설정이 키째 뺀다. 보내지 않는 것과 같다.
     */
    public record ImageUrl(String url, String detail) {
    }

    /**
     * 이미지 판독 해상도. (OpenAI {@code image_url.detail})
     *
     * <p>세부가 결과를 가르는 단계 — 사람 얼굴의 피부 결, 서류의 숫자 — 에만
     * {@link #HIGH}를 쓴다. 분위기만 읽는 참고 사진에는 값어치가 없다.
     *
     * <p><b>실측(2026-08-18 · gpt-5.4) — 256~1024px 전 구간에서 {@code auto}와
     * {@code high}의 입력 토큰이 같았다.</b> 즉 지금 핀에서는 판독 결과가 달라지지
     * 않는다. 그럼에도 명시하는 이유는 <b>판독 해상도를 제공자 휴리스틱에 맡기지
     * 않기 위해서다</b> — {@code auto}가 무엇을 고를지는 이미지 크기와 모델 세대에
     * 따라 달라지고, 클라이언트가 사진을 더 작게 올리도록 바뀌면 조용히 낮아진다.
     */
    public enum ImageDetail {

        /** 제공자 기본값에 맡긴다. 요청에 {@code detail} 키를 넣지 않는다. */
        AUTO,
        LOW,
        HIGH;

        String wireValue() {
            return this == AUTO ? null : name().toLowerCase(Locale.ROOT);
        }
    }

    public record ResponseFormat(String type, @JsonProperty("json_schema") JsonNode jsonSchema) {

        public static ResponseFormat jsonSchema(JsonNode schema) {
            return new ResponseFormat("json_schema", schema);
        }
    }

    // ------------------------------------------------------------------ 응답

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ChatResponse(String model, List<Choice> choices, Usage usage) {

        public Choice firstChoice() {
            return choices == null || choices.isEmpty() ? null : choices.get(0);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Choice(ResponseMessage message, @JsonProperty("finish_reason") String finishReason) {
    }

    /** {@code refusal}이 채워져 오면 모델이 응답을 거부한 것이다. 정상 시나리오로 다룬다. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ResponseMessage(String content, String refusal) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Usage(
            @JsonProperty("prompt_tokens") Integer promptTokens,
            @JsonProperty("completion_tokens") Integer completionTokens) {
    }
}
