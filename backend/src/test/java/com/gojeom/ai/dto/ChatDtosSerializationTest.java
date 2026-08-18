package com.gojeom.ai.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gojeom.ai.dto.AiPayloads.ProfileAnalysisPayload;
import com.gojeom.ai.dto.ChatDtos.ImageDetail;
import com.gojeom.ai.dto.ChatDtos.ImagePart;
import com.gojeom.common.enums.CaptureIssue;
import com.gojeom.common.enums.CaptureReadability;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * OpenAI로 나가는 이미지 파트의 전선 형식과, 돌아오는 {@code capture} 파싱. (① · ④)
 *
 * <p>{@code detail}은 <b>키가 있느냐 없느냐</b>가 곧 동작이다. AUTO일 때 키가 남으면
 * 제공자 기본값에 맡기려던 의도가 깨진다. 전역 {@code non_null}에 기대고 있으므로
 * 그 전제가 바뀌면 여기서 잡힌다.
 */
class ChatDtosSerializationTest {

    /** 운영과 같은 설정. {@code application.yml}의 {@code non_null}을 그대로 재현한다. */
    private final ObjectMapper mapper = new ObjectMapper()
            .setSerializationInclusion(JsonInclude.Include.NON_NULL);

    @Test
    @DisplayName("HIGH는 detail을 실어 보낸다")
    void high는_detail을_보낸다() throws Exception {
        String json = mapper.writeValueAsString(ImagePart.of("https://storage/photo.png", ImageDetail.HIGH));

        assertThat(json).contains("\"detail\":\"high\"")
                .contains("\"image_url\"");
    }

    @Test
    @DisplayName("AUTO는 detail 키를 아예 보내지 않는다 — 제공자 기본값에 맡긴다")
    void auto는_detail을_생략한다() throws Exception {
        // 빈 문자열이나 "auto"를 보내는 것과 다르다. 키가 없어야 한다.
        String json = mapper.writeValueAsString(ImagePart.of("https://storage/mood.png", ImageDetail.AUTO));

        assertThat(json).doesNotContain("detail");
    }

    @Test
    @DisplayName("capture를 열거형으로 파싱한다")
    void capture를_파싱한다() throws Exception {
        String body = """
                {"faceImpression":["부드러운 얼굴선"],"bodyRange":"표준 범위",
                 "healthNotes":["평균 수면 6.5시간 · 사용자 입력 기준"],
                 "capture":{"readability":"LIMITED","issues":["DARK","BLURRY"]}}
                """;

        ProfileAnalysisPayload payload = mapper.readValue(body, ProfileAnalysisPayload.class);

        assertThat(payload.capture().readability()).isEqualTo(CaptureReadability.LIMITED);
        assertThat(payload.capture().issues()).containsExactly(CaptureIssue.DARK, CaptureIssue.BLURRY);
    }

    @Test
    @DisplayName("capture는 가드레일 검사 텍스트에 섞이지 않는다")
    void capture는_검사_대상_텍스트가_아니다() throws Exception {
        // 열거형뿐이라 검사할 문장이 없다. 여기 섞이면 "LIMITED" 같은 값이
        // 사용자 노출 텍스트로 취급돼 재생성 판정에 영향을 준다.
        String body = """
                {"faceImpression":["부드러운 얼굴선"],"bodyRange":"표준 범위",
                 "healthNotes":["평균 수면 6.5시간"],
                 "capture":{"readability":"LIMITED","issues":["DARK"]}}
                """;

        ProfileAnalysisPayload payload = mapper.readValue(body, ProfileAnalysisPayload.class);

        assertThat(payload.userFacingText()).doesNotContain("LIMITED", "DARK");
    }

    @Test
    @DisplayName("capture가 없는 옛 응답도 파싱된다")
    void capture가_없어도_파싱된다() throws Exception {
        // 이 필드가 생기기 전 형식이다. JSONB에 저장된 옛 요약을 다시 읽을 때의 모양이다.
        String body = """
                {"faceImpression":["부드러운 얼굴선"],"bodyRange":"표준 범위","healthNotes":["메모"]}
                """;

        ProfileAnalysisPayload payload = mapper.readValue(body, ProfileAnalysisPayload.class);

        assertThat(payload.capture()).isNull();
        assertThat(payload.faceImpression()).containsExactly("부드러운 얼굴선");
    }

    @Test
    @DisplayName("issues가 비어 있어도 파싱된다 — 잘 찍힌 사진의 정상 답이다")
    void issues가_비어도_된다() throws Exception {
        String body = """
                {"faceImpression":["부드러운 얼굴선"],"bodyRange":"표준 범위","healthNotes":["메모"],
                 "capture":{"readability":"CLEAR","issues":[]}}
                """;

        ProfileAnalysisPayload payload = mapper.readValue(body, ProfileAnalysisPayload.class);

        assertThat(payload.capture().readability()).isEqualTo(CaptureReadability.CLEAR);
        assertThat(payload.capture().issues()).isEmpty();
    }

    @Test
    @DisplayName("파생 메서드가 JSON 속성으로 새지 않는다")
    void 파생_메서드가_새지_않는다() throws Exception {
        // AiPayloads의 @JsonIgnore 규칙. JSONB에 "userFacingText"가 저장되면 안 된다. (D1-7)
        ProfileAnalysisPayload payload = new ProfileAnalysisPayload(
                List.of("부드러운 얼굴선"), "표준 범위", List.of("메모"), null);

        assertThat(mapper.writeValueAsString(payload)).doesNotContain("userFacingText");
    }
}
