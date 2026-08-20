import { Image } from 'expo-image';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { PRODUCTS, PRODUCT_GROUPS, type Product } from '@/data/products';
import { colors, fonts, radius, shadow, spacing, typography } from '@/theme/tokens';

/**
 * 상품 카드.
 *
 * <p>누르면 <b>제조사 상세 페이지를 연다.</b> 앱 안에 상세를 다시 만들지 않는다 —
 * 성분·시험 결과처럼 바뀔 수 있는 내용을 우리가 베껴 두면 원본과 어긋난다.
 * 효능 수치를 우리 화면에 옮기지 않는 이유이기도 하다. (PRD G-3)
 */
function ProductCard({ product, wide = false }: { product: Product; wide?: boolean }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${product.name} 자세히 보기`}
      onPress={() => void Linking.openURL(product.url)}
      style={[styles.card, wide && styles.cardWide]}
    >
      <Image source={product.image} contentFit="contain" style={styles.thumb} accessibilityLabel={product.name} />
      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.summary} numberOfLines={2}>{product.summary}</Text>
        <View style={styles.tags}>
          {product.tags.slice(0, wide ? 3 : 2).map((tag) => (
            <View key={tag} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

/**
 * 홈 맨 아래 상품 진열. **묶음별로 나눠 보여준다.** (피드백 11번)
 *
 * <p>여덟 개를 한 줄로 세우면 무엇이 무엇인지 알기 어렵다. 겨냥하는 고민으로 묶고
 * 묶음마다 "언제 쓰는 것인지"를 한 줄로 붙였다.
 *
 * <p>키링은 화장품이 아니라 <b>따로 묶어 맨 뒤에 둔다.</b> 피부 고민으로 추천되지도
 * 않는다({@code concerns}가 비어 있다).
 */
export function ProductShelf() {
  return (
    <View style={styles.shelf}>
      <Text style={styles.sectionTitle}>이런 제품도 있어요</Text>
      <Text style={styles.sectionLead}>피부 고민에 따라 묶어봤어요. 누르면 자세한 설명을 볼 수 있어요.</Text>
      {PRODUCT_GROUPS.map((group) => {
        const items = PRODUCTS.filter((product) => product.group === group.key);
        if (!items.length) return null;
        return (
          <View key={group.key} style={styles.group}>
            <Text style={styles.groupTitle}>{group.label}</Text>
            <Text style={styles.groupHint}>{group.hint}</Text>
            <View style={styles.grid}>
              {items.map((product) => <ProductCard key={product.id} product={product} />)}
            </View>
          </View>
        );
      })}
      {/*
        제조사가 밝힌 내용을 우리가 보증하지 않는다는 것을 분명히 한다.
        결과지의 disclaimer와 같은 자리에 있는 문구다. (PRD G-3)
      */}
      <Text style={styles.disclaimer}>
        제품 정보는 제조사가 제공한 내용이에요. 피부 상태에 따라 맞지 않을 수 있어요.
      </Text>
    </View>
  );
}

export { ProductCard };

const styles = StyleSheet.create({
  shelf: { gap: 6, marginTop: spacing.lg },
  sectionTitle: { ...typography.title, color: colors.text },
  sectionLead: { ...typography.caption, color: colors.textMuted, marginBottom: 4 },
  group: { gap: 2, marginTop: spacing.md },
  groupTitle: { ...typography.caption, fontFamily: fonts.semibold, fontWeight: '700', fontSize: 13, color: colors.text },
  groupHint: { ...typography.caption, color: colors.textTertiary, fontSize: 11, marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: { flexGrow: 1, flexBasis: '46%', gap: 8, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow },
  cardWide: { flexBasis: '100%' },
  thumb: { width: '100%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.surfaceSunken },
  copy: { gap: 4 },
  name: { ...typography.caption, fontFamily: fonts.semibold, fontWeight: '600', color: colors.text, lineHeight: 16 },
  summary: { ...typography.caption, color: colors.textMuted, fontSize: 11, lineHeight: 15 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.surfaceSunken },
  tagText: { ...typography.caption, color: colors.textTertiary, fontSize: 10 },
  disclaimer: { ...typography.caption, color: colors.textTertiary, fontSize: 11, marginTop: spacing.md, lineHeight: 16 },
});
