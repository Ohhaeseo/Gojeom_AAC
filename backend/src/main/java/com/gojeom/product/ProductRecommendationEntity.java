package com.gojeom.product;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * 분석 결과별 상품 추천 캐시. (V14)
 *
 * <p>홈을 열 때마다 AI를 부르면 화면을 볼 때마다 4~6초와 비용이 든다. 결과지 하나에
 * 대한 답은 바뀌지 않으므로 한 번 고르고 재사용한다.
 *
 * <p><b>빈 목록도 답이다.</b> "어울리는 것이 없다"와 "아직 안 골랐다"는 다르다.
 * 행이 있으면 이미 고른 것이므로 다시 부르지 않는다.
 */
@Entity
@Table(name = "product_recommendations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProductRecommendationEntity {

    @Id
    @Column(name = "analysis_result_id", nullable = false, updatable = false)
    private UUID analysisResultId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "product_ids", nullable = false)
    private List<String> productIds;

    @Column(name = "reason", length = 200)
    private String reason;

    private ProductRecommendationEntity(UUID analysisResultId, List<String> productIds, String reason) {
        this.analysisResultId = analysisResultId;
        this.productIds = productIds;
        this.reason = reason;
    }

    public static ProductRecommendationEntity of(UUID analysisResultId, List<String> productIds, String reason) {
        return new ProductRecommendationEntity(analysisResultId, productIds, reason);
    }
}
