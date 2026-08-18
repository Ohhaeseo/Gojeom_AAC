package com.gojeom.ai.schema;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Structured Outputs strict 모드 불변식 검사.
 *
 * <p>strict 모드는 <b>모든 객체에 {@code additionalProperties: false}</b>가 있고
 * <b>모든 프로퍼티가 {@code required}</b>여야 한다. 하나라도 어기면 OpenAI가 400을
 * 돌려주는데, 그 사실을 실제 호출에서야 알게 되면 파이프라인 한복판에서 터진다.
 * 여기서 미리 잡는다.
 *
 * <p>스키마가 API.md §7.2~7.3과 어긋나지 않는지도 함께 고정한다.
 */
class JsonSchemasTest {

    private final JsonSchemas schemas = new JsonSchemas(new ObjectMapper());

    @Test
    @DisplayName("모든 스키마가 strict 모드 불변식을 지킨다")
    void strict_불변식() {
        for (JsonNode root : List.of(
                schemas.keywordExtraction(), schemas.resultGeneration(), schemas.profileAnalysis(),
                schemas.routineFromAnalysis(), schemas.routineStandalone(),
                schemas.inbodyOcr())) {

            assertThat(root.path("strict").asBoolean()).isTrue();
            assertThat(root.path("name").asText()).isNotBlank();

            List<String> problems = new ArrayList<>();
            walk(root.path("schema"), "schema", problems);
            assertThat(problems)
                    .as("%s 스키마의 strict 위반", root.path("name").asText())
                    .isEmpty();
        }
    }

    @Test
    @DisplayName("키워드 카테고리는 FACE를 포함한 4종이다")
    void 키워드_카테고리_4종() {
        JsonNode categoryEnum = schemas.keywordExtraction()
                .at("/schema/properties/keywords/items/properties/category/enum");

        assertThat(categoryEnum).hasSize(4);
        assertThat(categoryEnum.toString()).contains("FACE");
    }

    @Test
    @DisplayName("categoryChanges 카테고리는 FACE 없는 3종이고 정확히 3건이다")
    void 결과_카테고리_3종() {
        JsonNode changes = schemas.resultGeneration().at("/schema/properties/categoryChanges");

        assertThat(changes.path("minItems").asInt()).isEqualTo(3);
        assertThat(changes.path("maxItems").asInt()).isEqualTo(3);

        JsonNode categoryEnum = changes.at("/items/properties/category/enum");
        assertThat(categoryEnum).hasSize(3);
        assertThat(categoryEnum.toString()).doesNotContain("FACE");
    }

    @Test
    @DisplayName("프로필 분석 스키마에 점수·등급 필드가 없다 (G-1)")
    void 프로필_분석에_점수_필드가_없다() {
        String properties = schemas.profileAnalysis().at("/schema/properties").toString().toLowerCase();

        assertThat(properties).doesNotContain("score", "grade", "rank", "point");
    }

    @Test
    @DisplayName("촬영 품질은 열거형으로만 받는다 — 자유 서술 칸을 두지 않는다 (④)")
    void 촬영_품질은_열거형뿐이다() {
        JsonNode capture = schemas.profileAnalysis().at("/schema/properties/capture/properties");

        assertThat(capture.path("readability").path("enum").toString())
                .isEqualTo("[\"CLEAR\",\"PARTIAL\",\"LIMITED\"]");
        assertThat(capture.path("issues").path("items").path("enum")).isNotEmpty();

        // 문장을 짓게 하는 순간 사용자에게 노출되는 텍스트가 하나 늘고,
        // 그만큼 OutputValidator가 지켜야 할 표면이 넓어진다. 화면 문구는 프론트가 만든다.
        capture.fieldNames().forEachRemaining(name -> {
            JsonNode field = capture.path(name);
            JsonNode leaf = field.has("items") ? field.path("items") : field;
            assertThat(leaf.has("enum"))
                    .as("capture.%s가 열거형이 아니다", name)
                    .isTrue();
        });
    }

    @Test
    @DisplayName("촬영 품질에도 점수·등급을 뜻하는 이름을 쓰지 않는다 (G-1)")
    void 촬영_품질에_등급_이름을_쓰지_않는다() {
        // 스키마의 필드 이름은 모델도 읽는다. 얼굴 정보 옆에 "등급" 칸을 두면
        // 모델이 얼굴에 등급을 매기기 시작한다. 값 이름까지 함께 본다.
        String capture = schemas.profileAnalysis().at("/schema/properties/capture").toString().toLowerCase();

        assertThat(capture).doesNotContain("score", "grade", "rank", "point");
    }

    /** 모든 object 노드가 두 조건을 지키는지 재귀 확인. */
    private void walk(JsonNode node, String path, List<String> problems) {
        if (!node.isObject()) {
            return;
        }
        if ("object".equals(node.path("type").asText())) {
            if (!node.path("additionalProperties").isBoolean()
                    || node.path("additionalProperties").asBoolean()) {
                problems.add(path + ": additionalProperties가 false가 아니다");
            }
            List<String> required = new ArrayList<>();
            node.path("required").forEach(n -> required.add(n.asText()));
            node.path("properties").fieldNames().forEachRemaining(name -> {
                if (!required.contains(name)) {
                    problems.add(path + "." + name + ": required에 빠져 있다");
                }
            });
        }
        node.path("properties").fields().forEachRemaining(
                e -> walk(e.getValue(), path + "." + e.getKey(), problems));
        walk(node.path("items"), path + "[]", problems);
    }
}
