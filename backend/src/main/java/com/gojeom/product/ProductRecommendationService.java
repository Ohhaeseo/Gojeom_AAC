package com.gojeom.product;

import com.gojeom.ai.AiException;
import com.gojeom.ai.AiTextService;
import com.gojeom.ai.dto.AiPayloads.ProductRecommendation;
import com.gojeom.ai.prompt.ProductRecommendationPrompt;
import com.gojeom.analysis.entity.AnalysisResult;
import com.gojeom.analysis.entity.CategoryChange;
import com.gojeom.analysis.repository.AnalysisRepository;
import com.gojeom.analysis.repository.AnalysisResultRepository;
import com.gojeom.common.enums.Category;
import com.gojeom.common.exception.BusinessException;
import com.gojeom.common.exception.ErrorCode;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 분석 결과에 어울리는 상품 고르기. (피드백 11번)
 *
 * <p><b>한 번 고르고 캐시한다.</b> 홈을 열 때마다 AI를 부르면 화면을 볼 때마다
 * 4~6초와 비용이 든다. 결과지 하나에 대한 답은 바뀌지 않는다. (V14)
 *
 * <p><b>모델이 낸 id를 그대로 믿지 않는다.</b> 목록에 없는 id는 버린다. 프롬프트로
 * 막아도 모델은 없는 것을 지어낼 수 있고, 그러면 화면이 찾지 못하는 상품이 나온다.
 * 같은 상품의 다른 용량도 서버에서 한 번 더 걸러 하나만 남긴다.
 *
 * <p><b>AI가 실패해도 화면을 막지 않는다.</b> 빈 추천으로 돌려주면 화면이 규칙 기반
 * 추천과 성분 이야기로 대신한다. 곁다리 기능이 본 화면을 무너뜨리면 안 된다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProductRecommendationService {

    private final ProductRecommendationRepository repository;
    private final AnalysisResultRepository resultRepository;
    private final AnalysisRepository analysisRepository;
    private final AiTextService aiTextService;
    private final ProductRecommendationPrompt prompt;

    @Transactional
    public ProductRecommendationView recommend(UUID userId, UUID resultId) {
        AnalysisResult result = resultRepository.findById(resultId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        requireOwner(userId, result);

        // 이미 고른 적이 있으면 그것을 쓴다. **빈 목록도 고른 결과다.**
        var cached = repository.findById(resultId).orElse(null);
        if (cached != null) {
            return toView(cached.getProductIds(), cached.getReason());
        }

        ProductRecommendation picked = pick(result);
        List<String> ids = sanitize(picked.productIds());
        repository.save(ProductRecommendationEntity.of(resultId, ids, picked.reason()));
        return toView(ids, picked.reason());
    }

    /** AI 실패를 화면 오류로 올리지 않는다. 빈 추천이면 화면이 성분 이야기로 대신한다. */
    private ProductRecommendation pick(AnalysisResult result) {
        try {
            return aiTextService.generate(
                    prompt.build(result.getAnalysisId(), digest(result)),
                    ProductRecommendation::userFacingText);
        } catch (AiException e) {
            log.warn("상품 추천 실패 code={} : {}", e.errorCode().name(), e.getMessage());
            return new ProductRecommendation(List.of(), null);
        }
    }

    /**
     * 고르는 근거. <b>피부 쪽만 넘긴다.</b>
     *
     * <p>목록이 전부 스킨케어라 체형·건강 문장을 같이 주면 모델이 관계없는 상품을
     * 억지로 잇는다. 요약은 피부 이야기가 아닐 수 있어 빼고, 피부 변화 방향만 준다.
     */
    private String digest(AnalysisResult result) {
        List<CategoryChange> changes = result.getCategoryChanges();
        if (changes == null) {
            return "";
        }
        return changes.stream()
                .filter(change -> change.category() == Category.SKIN)
                .map(CategoryChange::description)
                .findFirst()
                .orElse("");
    }

    /**
     * 모델이 낸 id를 거른다.
     *
     * <ul>
     *   <li>목록에 없는 id는 버린다 — 지어낸 것이다</li>
     *   <li>같은 상품의 다른 용량은 하나만 남긴다 — 50ml와 15ml가 나란히 나오지 않게</li>
     *   <li>최대 3개</li>
     * </ul>
     */
    private List<String> sanitize(List<String> ids) {
        if (ids == null) {
            return List.of();
        }
        java.util.Set<String> families = new java.util.HashSet<>();
        List<String> kept = new java.util.ArrayList<>();
        for (String id : ids) {
            if (!ProductCatalog.contains(id) || kept.contains(id)) {
                continue;
            }
            String family = family(id);
            if (!families.add(family)) {
                continue;
            }
            kept.add(id);
            if (kept.size() == 3) {
                break;
            }
        }
        return kept;
    }

    /** 용량만 다른 것을 같은 묶음으로 본다. `core-rebuild-cream-50` → `core-rebuild-cream` */
    private String family(String id) {
        return id.replaceAll("-\\d+$", "");
    }

    private void requireOwner(UUID userId, AnalysisResult result) {
        boolean owned = analysisRepository.findById(result.getAnalysisId())
                .map(analysis -> analysis.isOwnedBy(userId))
                .orElse(false);
        if (!owned) {
            throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE);
        }
    }

    private ProductRecommendationView toView(List<String> ids, String reason) {
        return new ProductRecommendationView(ids == null ? List.of() : ids, reason);
    }

    /** 서버는 <b>id만</b> 돌려준다. 사진·링크는 화면이 갖고 있다. */
    public record ProductRecommendationView(List<String> productIds, String reason) {
    }
}
