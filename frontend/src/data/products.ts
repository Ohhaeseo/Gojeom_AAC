import type { ImageSourcePropType } from 'react-native';

/**
 * 추천 상품 목록. (피드백 11번)
 *
 * <b>화면에 효능 수치를 쓰지 않는다.</b> 제조사 상세 페이지에는 "1회 사용 후 진정
 * 97.4% 개선" 같은 시험 결과가 있지만, 그것을 우리 화면에 옮기는 순간 **서비스가
 * 그 효과를 보장하는 말**이 된다. PRD G-3이 금지하는 "효능 보장 표현"이 정확히
 * 이것이고, 우리가 검증한 수치도 아니다. 자세한 내용은 상세 페이지로 보낸다.
 *
 * 같은 이유로 "좋아진다 · 낫는다 · 치료" 같은 말도 쓰지 않는다. 무엇을 겨냥한
 * 제품인지만 담담히 적는다.
 */
export type ProductGroupKey = 'SOOTHE' | 'BARRIER' | 'CLEANSE' | 'SUN' | 'ACCESSORY';

export type Product = {
  id: string;
  name: string;
  /** 제조사 상세 페이지. 효능·성분 같은 자세한 내용은 여기서 본다. */
  url: string;
  group: ProductGroupKey;
  /** 검색·추천에 쓰는 태그. 사용자에게도 그대로 보여준다. */
  tags: string[];
  /** 한 줄 설명. **무엇을 겨냥한 제품인지**만 적는다. (PRD G-3) */
  summary: string;
  /** 이 제품을 권할 만한 고민 낱말. 분석 결과 문장과 맞춰본다. */
  concerns: string[];
  image: ImageSourcePropType;
};

/** 묶음 이름과 순서. 화면은 이 순서대로 그린다. */
export const PRODUCT_GROUPS: { key: ProductGroupKey; label: string; hint: string }[] = [
  { key: 'SOOTHE', label: '진정 · 수분', hint: '붉어짐이나 당김이 신경 쓰일 때' },
  { key: 'BARRIER', label: '피부 장벽', hint: '자주 예민해지고 쉽게 건조할 때' },
  { key: 'CLEANSE', label: '정돈 · 결', hint: '모공과 피부결을 정돈하고 싶을 때' },
  { key: 'SUN', label: '자외선 · 안티에이징', hint: '매일 바르는 자외선 관리' },
  { key: 'ACCESSORY', label: '함께 쓰는 것', hint: '화장품이 아닌 액세서리예요' },
];

export const PRODUCTS: Product[] = [
  {
    id: 'blue-repair-soothing-cream',
    name: '피쓰 블루 리페어 하이드로 수딩 크림 120ml',
    url: 'https://pithseoul.com/product/detail.html?cate_no=42&display_group=1&product_no=42',
    group: 'SOOTHE',
    tags: ['피부 진정', '장벽 회복', '수분 크림'],
    summary: '진정과 수분에 초점을 둔 수딩 크림이에요.',
    concerns: ['진정', '붉', '열감', '수분', '건조', '보습', '예민', '자극'],
    image: require('../../assets/products/blue-repair-soothing-cream.png'),
  },
  {
    id: 'blue-repair-solution',
    name: '피쓰 블루 리페어 솔루션 1매',
    url: 'https://pithseoul.com/product/detail.html?cate_no=42&display_group=1&product_no=13',
    group: 'SOOTHE',
    tags: ['피부 진정', '집중 보습', '마스크팩'],
    summary: '마스크와 크림을 함께 쓰는 집중 보습 솔루션이에요.',
    concerns: ['진정', '수분', '건조', '보습', '집중'],
    image: require('../../assets/products/blue-repair-solution.png'),
  },
  {
    id: 'core-rebuild-cream-50',
    name: '피쓰 코어 리빌드 크림 50ml',
    url: 'https://pithseoul.com/product/detail.html?cate_no=42&display_group=1&product_no=12',
    group: 'BARRIER',
    tags: ['피부 장벽', '피부 진정', '재생 크림'],
    summary: '피부 장벽 관리에 초점을 둔 크림이에요.',
    concerns: ['장벽', '예민', '자극', '건조', '진정', '결'],
    image: require('../../assets/products/core-rebuild-cream-50.png'),
  },
  {
    id: 'core-rebuild-cream-15',
    name: '피쓰 코어 리빌드 크림 15ml',
    url: 'https://pithseoul.com/product/detail.html?cate_no=42&display_group=1&product_no=11',
    group: 'BARRIER',
    tags: ['피부 장벽', '피부 진정', '휴대용 크림'],
    summary: '50ml와 같은 크림의 휴대용 용량이에요.',
    concerns: ['장벽', '예민', '자극', '건조', '휴대'],
    image: require('../../assets/products/core-rebuild-cream-15.png'),
  },
  {
    id: 'clarify-gel-toner',
    name: '피쓰 클래리파이 겔 토너 340g',
    url: 'https://pithseoul.com/product/detail.html?cate_no=42&display_group=1&product_no=49',
    group: 'CLEANSE',
    tags: ['피부 정화', '수분 균형', '저자극 토너'],
    summary: '피부를 정돈하고 수분 균형을 잡는 겔 토너예요.',
    concerns: ['모공', '결', '정돈', '유분', '각질', '수분', '균형'],
    image: require('../../assets/products/clarify-gel-toner.png'),
  },
  {
    id: 'sun-essence-30',
    name: '피쓰 판테티놀 선 에센스 30ml',
    url: 'https://pithseoul.com/product/detail.html?cate_no=42&display_group=1&product_no=37',
    group: 'SUN',
    tags: ['자외선 차단', '안티에이징', '데일리 선케어'],
    summary: '매일 쓰는 용량의 선 에센스예요.',
    concerns: ['자외선', '선케어', '주름', '탄력', '톤'],
    image: require('../../assets/products/sun-essence-30.png'),
  },
  {
    id: 'sun-essence-10',
    name: '피쓰 판테티놀 선 에센스 10ml',
    url: 'https://pithseoul.com/product/detail.html?cate_no=42&display_group=1&product_no=38',
    group: 'SUN',
    tags: ['자외선 차단', '안티에이징', '휴대용 선케어'],
    summary: '덧바르기 좋은 휴대용 선 에센스예요.',
    concerns: ['자외선', '선케어', '외출', '휴대', '주름'],
    image: require('../../assets/products/sun-essence-10.png'),
  },
  {
    id: 'portable-keyring',
    name: '피쓰 포터블 키링 (선 에센스 전용)',
    url: 'https://pithseoul.com/product/detail.html?cate_no=42&display_group=1&product_no=47',
    group: 'ACCESSORY',
    tags: ['선케어 액세서리', '휴대용 케이스', '선 에센스 전용'],
    summary: '선 에센스를 가방에 걸어 두는 전용 키링이에요.',
    // 화장품이 아니라 액세서리다. 피부 고민으로 추천하지 않는다.
    concerns: [],
    image: require('../../assets/products/portable-keyring.png'),
  },
];

/**
 * 분석 결과에 맞는 제품 고르기.
 *
 * <p>결과지의 <b>피부 카테고리 문장과 고른 키워드</b>에 제품의 `concerns`가 걸리는지
 * 본다. AI를 다시 부르지 않는다 — 여덟 개 중에서 고르는 일에 4~6초와 비용을 쓸
 * 이유가 없고, 무엇을 근거로 골랐는지도 이 편이 분명하다.
 *
 * <p><b>걸리는 것이 없으면 빈 배열을 돌려준다.</b> 억지로 아무거나 채우지 않는다 —
 * 관계없는 제품을 "당신을 위한 추천"으로 내놓으면 나머지 추천까지 믿지 않게 된다.
 * 그때는 화면이 성분 이야기로 대신한다.
 */
export function recommendProducts(text: string, limit = 3): Product[] {
  const haystack = text.replace(/\s+/g, '');
  if (!haystack) return [];

  return PRODUCTS
    .map((product) => ({
      product,
      hits: product.concerns.filter((word) => haystack.includes(word)).length,
    }))
    .filter((entry) => entry.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, limit)
    .map((entry) => entry.product);
}

/**
 * 맞는 제품이 없을 때 대신 보여줄 성분 이야기.
 *
 * <p><b>"좋아진다"고 말하지 않는다.</b> 무엇을 겨냥한 성분인지만 적는다. (PRD G-3)
 * 고민 낱말이 걸리지 않으면 가장 무난한 것부터 보여준다.
 */
export type IngredientGuide = { keywords: string[]; title: string; body: string };

export const INGREDIENT_GUIDES: IngredientGuide[] = [
  {
    keywords: ['진정', '붉', '열감', '예민', '자극'],
    title: '진정을 겨냥한 성분',
    body: '판테놀, 마데카소사이드, 알란토인이 들어간 제품을 살펴보세요. 향료와 알코올이 적은 것부터 고르면 부담이 덜해요.',
  },
  {
    keywords: ['건조', '수분', '보습', '당김'],
    title: '수분을 잡아주는 성분',
    body: '히알루론산, 글리세린, 스쿠알란이 들어간 제품을 살펴보세요. 세안 직후 물기가 남았을 때 바르면 더 오래 머물러요.',
  },
  {
    keywords: ['장벽', '트러블', '각질'],
    title: '장벽을 겨냥한 성분',
    body: '세라마이드, 콜레스테롤, 지방산이 함께 들어간 제품을 살펴보세요. 한 번에 여러 가지를 바꾸기보다 하나씩 더해보는 편이 좋아요.',
  },
  {
    keywords: ['모공', '유분', '결', '정돈'],
    title: '결을 정돈하는 성분',
    body: '나이아신아마이드, 아연(징크), 저농도 BHA가 들어간 제품을 살펴보세요. 매일보다 주 2~3회부터 시작하는 편이 무난해요.',
  },
  {
    keywords: ['톤', '자외선', '주름', '탄력'],
    title: '자외선과 톤을 겨냥한 성분',
    body: '자외선 차단제를 매일 쓰는 것이 먼저예요. 여기에 비타민C 유도체나 나이아신아마이드를 더하면 톤 관리에 함께 쓸 수 있어요.',
  },
];

/** 아무것도 걸리지 않았을 때. 어떤 피부든 어긋나지 않는 이야기를 고른다. */
const DEFAULT_GUIDE: IngredientGuide = {
  keywords: [],
  title: '수분을 잡아주는 성분',
  body: '히알루론산, 글리세린, 스쿠알란이 들어간 제품을 살펴보세요. 세안 직후 물기가 남았을 때 바르면 더 오래 머물러요.',
};

/**
 * 결과 문장에서 걸리는 성분 이야기를 고른다.
 *
 * <b>항상 하나는 돌려준다.</b> 걸리는 것이 없어도 빈 화면을 보여주지 않는다 —
 * 가장 무난한 수분 이야기를 기본으로 둔다.
 */
export function ingredientGuide(text: string): IngredientGuide {
  const haystack = text.replace(/\s+/g, '');
  return INGREDIENT_GUIDES.find((guide) => guide.keywords.some((word) => haystack.includes(word)))
    ?? DEFAULT_GUIDE;
}
