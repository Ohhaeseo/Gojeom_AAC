package com.gojeom.product;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRecommendationRepository extends JpaRepository<ProductRecommendationEntity, UUID> {
}
