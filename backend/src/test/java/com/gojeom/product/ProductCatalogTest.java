package com.gojeom.product;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 카탈로그가 프롬프트에 실려 나가는 모양.
 *
 * <p><b>효능 수치가 프롬프트에 들어가면 안 된다.</b> "97.4% 개선" 같은 말이 입력에
 * 있으면 모델이 그것을 근거로 문장을 만들고, PRD G-3이 금지하는 표현이 그렇게
 * 새어 나온다.
 */
class ProductCatalogTest {

    @Test
    @DisplayName("키링은 추천 대상이 아니다 — 화장품이 아니다")
    void 키링은_없다() {
        assertThat(ProductCatalog.contains("portable-keyring")).isFalse();
        assertThat(ProductCatalog.items()).hasSize(7);
    }

    @Test
    @DisplayName("프롬프트에 효능 수치가 실리지 않는다")
    void 효능_수치가_없다() {
        String prompt = ProductCatalog.forPrompt();

        assertThat(prompt).doesNotContainPattern("[0-9]+([.][0-9]+)?[ ]*%");
        assertThat(prompt).doesNotContain("개선", "효과", "치료", "등급", "배");
    }

    @Test
    @DisplayName("프롬프트에 모든 id가 들어간다 — 모델이 고를 수 있는 전부다")
    void 모든_id가_실린다() {
        String prompt = ProductCatalog.forPrompt();

        ProductCatalog.items().forEach(item -> assertThat(prompt).contains(item.id()));
    }
}
