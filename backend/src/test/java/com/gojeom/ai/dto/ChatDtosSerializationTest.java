package com.gojeom.ai.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gojeom.ai.dto.ChatDtos.ImageDetail;
import com.gojeom.ai.dto.ChatDtos.ImagePart;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * OpenAI로 나가는 이미지 파트의 전선 형식. (①)
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
}
