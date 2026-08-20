package com.gojeom.ai.prompt;

import com.gojeom.ai.AiStage;
import com.gojeom.ai.OpenAiRequest;
import com.gojeom.ai.dto.AiPayloads.ProductRecommendation;
import com.gojeom.ai.schema.JsonSchemas;
import com.gojeom.product.ProductCatalog;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 분석 결과 → 어울리는 상품 고르기. (피드백 11번)
 *
 * <p><b>고르는 일만 시킨다.</b> 새 상품을 지어내거나 설명을 다시 쓰게 하지 않는다.
 * 모델이 낼 수 있는 것은 목록에 있는 id뿐이고, 서버가 그것을 한 번 더 거른다.
 *
 * <p><b>없으면 없다고 답하게 둔다.</b> "무조건 3개를 고르라"고 하면 관계없는 상품이
 * "당신을 위한 추천"으로 나간다. 그러면 맞는 추천까지 믿지 않게 된다.
 */
@Component
@RequiredArgsConstructor
public class ProductRecommendationPrompt {

    private static final String INSTRUCTION = """

            [이 단계의 작업]
            분석 결과에 나온 피부 고민을 보고, 아래 목록에서 어울리는 상품을 최대 3개 고른다.

            - **목록에 있는 id만 낸다.** 새 상품을 지어내지 않는다.
            - **어울리는 것이 없으면 productIds를 빈 배열로 낸다.** 억지로 채우지 않는다.
              고민과 상관없는 상품을 권하면 사용자가 나머지 추천도 믿지 않게 된다.
            - 같은 상품의 다른 용량(예: 50ml와 15ml)을 함께 고르지 않는다. 하나만 고른다.
            - reason은 **왜 이것을 골랐는지** 한 문장으로 쓴다. 사용자의 고민과 상품을
              잇는 말이어야 한다. 예) "붉은기와 건조가 함께 있어 진정 위주로 골랐어요."

            [절대 쓰지 않는 말]
            - **효과를 약속하는 말.** "좋아집니다" · "개선됩니다" · "낫습니다" · "효과가 있습니다"
            - **수치.** 퍼센트·배수·등급을 쓰지 않는다. 시험 결과를 옮기지 않는다.
            - **의료·시술 표현.** "치료" · "처방" · "시술" (PRD G-3)
            - 진단하듯 단정하지 않는다. 무엇을 겨냥한 상품인지만 말한다.

            [고를 수 있는 상품]
            """;

    private final JsonSchemas schemas;

    /**
     * @param analysisId  {@code ai_jobs.analysis_id}로 기록된다
     * @param resultDigest 결과지에서 뽑은 피부 고민 요약. 이것이 고르는 근거다
     */
    public OpenAiRequest<ProductRecommendation> build(UUID analysisId, String resultDigest) {
        return OpenAiRequest.builder(AiStage.PRODUCT_RECOMMENDATION, ProductRecommendation.class)
                .analysisId(analysisId)
                .schema(schemas.productRecommendation())
                .system(SystemPrompts.base() + INSTRUCTION + ProductCatalog.forPrompt())
                .text("[분석 결과에서 읽은 피부 고민]\n" + resultDigest)
                .build();
    }
}
