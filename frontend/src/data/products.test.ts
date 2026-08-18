import { PRODUCTS, PRODUCT_GROUPS, ingredientGuide, recommendProducts } from '@/data/products';

/**
 * 추천 규칙. **틀린 추천보다 안 하는 편이 낫다** — 관계없는 제품을 "당신을 위한
 * 추천"으로 내놓으면 나머지 추천까지 믿지 않게 된다.
 */

describe('상품 데이터', () => {
  it('8개가 모두 묶음에 들어간다', () => {
    expect(PRODUCTS).toHaveLength(8);
    const keys = PRODUCT_GROUPS.map((group) => group.key);
    PRODUCTS.forEach((product) => expect(keys).toContain(product.group));
  });

  it('id가 겹치지 않는다', () => {
    expect(new Set(PRODUCTS.map((p) => p.id)).size).toBe(PRODUCTS.length);
  });

  // 효능 수치를 화면에 옮기지 않는다. (PRD G-3)
  it('설명에 퍼센트·배수 같은 효능 수치를 쓰지 않는다', () => {
    PRODUCTS.forEach((product) => {
      expect(product.summary).not.toMatch(/\d+(\.\d+)?\s*(%|배|℃)/);
      expect(product.summary).not.toMatch(/치료|효과가|개선율|보장/);
    });
  });
});

describe('recommendProducts', () => {
  it('고민 낱말이 걸리는 제품을 고른다', () => {
    const picked = recommendProducts('붉어짐이 있고 건조해서 진정이 필요해요');

    expect(picked.length).toBeGreaterThan(0);
    expect(picked.every((p) => p.concerns.length > 0)).toBe(true);
  });

  it('더 많이 걸리는 제품이 앞에 온다', () => {
    const picked = recommendProducts('진정 수분 건조 보습 예민 자극');

    expect(picked[0]?.id).toBe('blue-repair-soothing-cream');
  });

  it('근거가 비면 아무것도 고르지 않는다', () => {
    expect(recommendProducts('')).toEqual([]);
    expect(recommendProducts('   ')).toEqual([]);
  });

  // 억지로 채우지 않는다. 빈 배열이면 화면이 성분 이야기로 대신한다.
  it('걸리는 것이 없으면 빈 배열이다', () => {
    expect(recommendProducts('오늘 날씨가 참 맑고 좋네요')).toEqual([]);
  });

  it('키링은 피부 고민으로 추천되지 않는다 — 화장품이 아니다', () => {
    const everything = PRODUCTS.flatMap((p) => p.concerns).join(' ');

    expect(recommendProducts(everything, 8).map((p) => p.id)).not.toContain('portable-keyring');
  });

  it('개수를 넘기지 않는다', () => {
    expect(recommendProducts('진정 수분 건조 장벽 모공 자외선', 2)).toHaveLength(2);
  });
});

describe('ingredientGuide', () => {
  it('고민에 맞는 이야기를 고른다', () => {
    expect(ingredientGuide('붉어짐과 예민함이 있어요').title).toBe('진정을 겨냥한 성분');
    expect(ingredientGuide('모공이 도드라져요').title).toBe('결을 정돈하는 성분');
  });

  // 빈 화면을 보여주지 않는다.
  it('걸리는 것이 없어도 항상 하나는 준다', () => {
    expect(ingredientGuide('오늘 날씨가 맑아요').title).toBeTruthy();
    expect(ingredientGuide('').body).toBeTruthy();
  });

  it('효능을 보장하는 말을 쓰지 않는다', () => {
    ['진정', '건조', '장벽', '모공', '자외선', ''].forEach((word) => {
      expect(ingredientGuide(word).body).not.toMatch(/치료|낫습니다|효과가 있|보장/);
    });
  });
});

describe('다듬은 낱말 규칙', () => {
  // `결`은 `결과`·`해결`에도 들어 있다. 한 글자짜리를 쓰지 않는 이유다.
  it('한 글자짜리 고민 낱말을 쓰지 않는다', () => {
    PRODUCTS.forEach((product) => {
      product.concerns.forEach((word) => expect(word.length).toBeGreaterThan(1));
    });
  });

  it('안내 문장에 흔한 말이 고민 낱말에 없다', () => {
    const banned = ['집중', '관리', '유지', '정돈', '균형', '휴대'];
    PRODUCTS.forEach((product) => {
      product.concerns.forEach((word) => expect(banned).not.toContain(word));
    });
  });

  // 같은 크림이 두 줄로 나오면 고를 것이 늘어난 게 아니라 자리만 차지한다.
  it('같은 제품의 다른 용량을 나란히 추천하지 않는다', () => {
    const picked = recommendProducts('자외선과 주름, 탄력이 신경 쓰여요', 3);
    const families = picked.map((p) => p.family);

    expect(new Set(families).size).toBe(families.length);
  });

  /**
   * 낱말을 많이 달아둔 제품이 무슨 고민에나 1등으로 올라오던 문제.
   * 비율로 재면 그 고민을 정면으로 겨냥하는 제품이 앞에 온다.
   */
  it('고민을 정면으로 겨냥하는 제품이 앞에 온다', () => {
    expect(recommendProducts('모공이 도드라지고 유분이 많아요')[0]?.id).toBe('clarify-gel-toner');
    expect(recommendProducts('피부톤과 자외선이 신경 쓰여요')[0]?.family).toBe('sun-essence');
    expect(recommendProducts('트러블이 반복되고 각질이 일어나요')[0]?.family).toBe('core-rebuild');
  });
});
