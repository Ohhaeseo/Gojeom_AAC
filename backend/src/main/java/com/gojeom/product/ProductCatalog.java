package com.gojeom.product;

import java.util.List;
import java.util.Optional;

/**
 * 추천 대상 상품 목록. (피드백 11번)
 *
 * <p><b>여기에는 AI가 고르는 데 필요한 것만 둔다</b> — id·이름·태그·한 줄 설명.
 * 사진과 상세 링크는 화면이 갖고 있다({@code frontend/src/data/products.ts}).
 * 서버가 돌려주는 것은 <b>id뿐</b>이고 화면이 그것으로 제 데이터를 찾는다.
 * 같은 내용을 두 곳에 두지 않으려는 것이다.
 *
 * <p><b>id는 두 곳이 같아야 한다.</b> 프론트에서 id를 바꾸면 서버가 고른 상품을
 * 화면이 못 찾는다. 못 찾은 id는 조용히 버려지므로(추천이 줄어들 뿐 깨지지 않는다)
 * 바꿀 일이 있으면 양쪽을 함께 고친다.
 *
 * <p><b>효능 수치를 넣지 않는다.</b> 프롬프트에 "97.4% 개선" 같은 말이 들어가면
 * 모델이 그것을 근거로 문장을 만든다. PRD G-3이 금지하는 표현이 그렇게 새어 나온다.
 */
public final class ProductCatalog {

    public record Item(String id, String name, List<String> tags, String summary) {
    }

    private static final List<Item> ITEMS = List.of(
            new Item("blue-repair-soothing-cream", "블루 리페어 하이드로 수딩 크림 120ml",
                    List.of("피부 진정", "장벽 회복", "수분 크림"),
                    "붉은기·열감·건조가 함께 있을 때 쓰는 진정 크림"),
            new Item("blue-repair-solution", "블루 리페어 솔루션 1매",
                    List.of("피부 진정", "집중 보습", "마스크팩"),
                    "마스크와 크림을 함께 쓰는 단기 집중 보습"),
            new Item("core-rebuild-cream-50", "코어 리빌드 크림 50ml",
                    List.of("피부 장벽", "피부 진정", "재생 크림"),
                    "장벽이 약해 트러블·각질이 반복될 때 쓰는 크림"),
            new Item("core-rebuild-cream-15", "코어 리빌드 크림 15ml",
                    List.of("피부 장벽", "피부 진정", "휴대용 크림"),
                    "50ml와 같은 크림의 휴대용 용량"),
            new Item("clarify-gel-toner", "클래리파이 겔 토너 340g",
                    List.of("피부 정화", "수분 균형", "저자극 토너"),
                    "모공·유분·피부결이 신경 쓰일 때 쓰는 겔 토너"),
            new Item("sun-essence-30", "판테티놀 선 에센스 30ml",
                    List.of("자외선 차단", "안티에이징", "데일리 선케어"),
                    "매일 쓰는 용량의 선 에센스"),
            new Item("sun-essence-10", "판테티놀 선 에센스 10ml",
                    List.of("자외선 차단", "안티에이징", "휴대용 선케어"),
                    "덧바르기 좋은 휴대용 선 에센스"));

    private ProductCatalog() {
    }

    public static List<Item> items() {
        return ITEMS;
    }

    public static boolean contains(String id) {
        return ITEMS.stream().anyMatch(item -> item.id().equals(id));
    }

    public static Optional<Item> find(String id) {
        return ITEMS.stream().filter(item -> item.id().equals(id)).findFirst();
    }

    /** 프롬프트에 넣을 목록. 모델이 고를 수 있는 것은 여기 적힌 id뿐이다. */
    public static String forPrompt() {
        StringBuilder text = new StringBuilder();
        ITEMS.forEach(item -> text
                .append("- id: ").append(item.id())
                .append(" | ").append(item.name())
                .append(" | ").append(String.join(", ", item.tags()))
                .append(" | ").append(item.summary())
                .append('\n'));
        return text.toString();
    }
}
