package com.gojeom.profile.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.gojeom.common.enums.Category;
import com.gojeom.profile.dto.ProfileDtos.ProfileResponse;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 프로필 응답의 null 키가 살아남는지.
 *
 * <p>전역 {@code default-property-inclusion: non_null}이 값 없는 필드를 <b>키째로</b> 지운다.
 * {@code analysisSummary}는 프로필 등록 직후 AI 분석이 끝나기 전까지 null이라 이 구멍에 정면으로
 * 걸렸다. 프론트가 "값이 null"과 "필드가 없음"을 따로 다루지 않아도 되게 여기서 고정한다.
 * (AGENTS.md N-7)
 */
class ProfileDtosSerializationTest {

    /** 운영과 같은 설정. {@code application.yml}의 {@code non_null}을 그대로 재현한다. */
    private final ObjectMapper mapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .setSerializationInclusion(JsonInclude.Include.NON_NULL);

    @Test
    @DisplayName("선택 정보와 analysisSummary가 null이어도 키가 남는다")
    void 프로필_응답의_null_키가_남는다() throws Exception {
        ProfileResponse response = new ProfileResponse(UUID.randomUUID(), "https://storage/photo.png",
                List.of(Category.SKIN, Category.BODY, Category.HEALTH), (short) 170, new BigDecimal("62.0"),
                null, null, null, OffsetDateTime.now());

        String json = mapper.writeValueAsString(response);

        assertThat(json).contains("\"sleepHours\":null")
                .contains("\"inbody\":null")
                .contains("\"analysisSummary\":null");
    }
}
