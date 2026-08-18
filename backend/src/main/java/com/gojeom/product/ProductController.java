package com.gojeom.product;

import com.gojeom.common.response.ApiResponse;
import com.gojeom.common.security.UserPrincipal;
import com.gojeom.product.ProductRecommendationService.ProductRecommendationView;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 상품 추천. (피드백 11번) */
@RestController
@RequestMapping("/api/v1/results")
@RequiredArgsConstructor
public class ProductController {

    private final ProductRecommendationService recommendationService;

    /**
     * 이 분석 결과에 어울리는 상품. <b>처음 부를 때 AI가 고르고, 이후에는 캐시</b>다.
     *
     * <p>돌려주는 것은 <b>id뿐</b>이다. 사진·링크·설명은 화면이 갖고 있다
     * ({@code frontend/src/data/products.ts}). 서버가 모르는 id를 화면이 만나면
     * 조용히 건너뛴다 — 추천이 줄어들 뿐 깨지지 않는다.
     *
     * <p>{@code productIds}가 비어 있는 것도 정상 답이다. 어울리는 것이 없으면
     * 화면이 성분 이야기로 대신한다.
     */
    @GetMapping("/{resultId}/product-recommendation")
    public ApiResponse<ProductRecommendationView> recommend(
            @AuthenticationPrincipal UserPrincipal me,
            @PathVariable UUID resultId) {
        return ApiResponse.ok(recommendationService.recommend(me.id(), resultId));
    }
}
