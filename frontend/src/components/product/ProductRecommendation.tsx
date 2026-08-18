import { StyleSheet, Text, View } from 'react-native';

import { ProductCard } from '@/components/product/ProductShelf';
import { ingredientGuide, recommendProducts } from '@/data/products';
import { colors, fonts, radius, spacing, typography } from '@/theme/tokens';

type Props = {
  /**
   * 분석 결과에서 뽑은 문장. 보통 피부 카테고리의 `description`과 고른 키워드를
   * 이어 붙인 것이다. **비어 있으면 아무것도 그리지 않는다** — 분석 전에는
   * 추천할 근거가 없다.
   */
  basis: string;
};

/**
 * 분석 결과를 근거로 한 추천. (피드백 11번)
 *
 * <p><b>맞는 제품이 없으면 억지로 채우지 않는다.</b> 관계없는 것을 "당신을 위한
 * 추천"으로 내놓으면 나머지 추천까지 믿지 않게 된다. 그럴 때는 <b>어떤 성분을 보면
 * 되는지</b>를 글로 알려준다 — 우리 제품이 아니어도 도움이 되는 쪽이 낫다.
 *
 * <p>추천 이유를 함께 적는다. 왜 이것이 나왔는지 모르면 광고로 읽힌다.
 */
export function ProductRecommendation({ basis }: Props) {
  if (!basis.trim()) return null;

  const picked = recommendProducts(basis);
  const guide = ingredientGuide(basis);

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>분석 결과로 고른 제품</Text>
      {picked.length ? (
        <>
          <Text style={styles.lead}>이번 분석에서 나온 피부 고민에 맞춰 골랐어요.</Text>
          <View style={styles.grid}>
            {picked.map((product) => <ProductCard key={product.id} product={product} />)}
          </View>
        </>
      ) : (
        /*
          걸리는 제품이 없을 때. **빈 화면으로 두지 않는다.**
          가진 것 중에 맞는 것이 없다고 해서 사용자가 할 수 있는 일이 없는 것은 아니다.
        */
        <View style={styles.guide}>
          <Text style={styles.lead}>이번 결과에 꼭 맞는 제품은 아직 없어요. 대신 이렇게 골라보세요.</Text>
          <Text style={styles.guideTitle}>{guide.title}</Text>
          <Text style={styles.guideBody}>{guide.body}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginTop: spacing.lg },
  sectionTitle: { ...typography.title, color: colors.text },
  lead: { ...typography.caption, color: colors.textMuted, marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  guide: { gap: 4, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surfaceSunken },
  guideTitle: { ...typography.caption, fontFamily: fonts.semibold, fontWeight: '700', fontSize: 13, color: colors.text },
  guideBody: { ...typography.body, color: colors.textTertiary, fontSize: 13, lineHeight: 20 },
});
