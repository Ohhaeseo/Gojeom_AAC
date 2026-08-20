-- 분석 결과별 상품 추천. AI가 고른 결과를 캐시한다. (피드백 11번)
--
-- 캐시하는 이유 — 홈을 열 때마다 AI를 부르면 화면을 볼 때마다 4~6초와 비용이 든다.
-- 결과지 하나에 대한 답은 바뀌지 않으므로 한 번 고르고 재사용한다.
--
-- analysis_result_id가 PK다. 결과 하나당 추천 하나이고, 결과가 지워지면 함께 사라진다.
--
-- product_ids는 **문자열 배열**이다. 상품 정보 자체는 코드가 들고 있고
-- (ProductCatalog · frontend/src/data/products.ts) 여기에는 무엇을 골랐는지만 남는다.
-- 상품 목록이 바뀌어도 이 표를 손댈 필요가 없고, 사라진 id는 화면이 조용히 건너뛴다.
--
-- **빈 배열도 답이다.** "어울리는 것이 없다"와 "아직 안 골랐다"는 다르다.
-- 행이 있고 배열이 비어 있으면 이미 고른 결과이므로 다시 AI를 부르지 않는다.

CREATE TABLE product_recommendations (
    analysis_result_id UUID PRIMARY KEY REFERENCES analysis_results(id) ON DELETE CASCADE,
    product_ids        JSONB       NOT NULL DEFAULT '[]',
    reason             VARCHAR(200),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
