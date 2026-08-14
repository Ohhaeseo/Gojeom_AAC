import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme/tokens';
import type { AnalysisResult } from '@/types/api';

type Props = {
  image: AnalysisResult['comparisonImage'];
  /** 4:3 가로형(결과지)과 정사각에 가까운 비율(목표)이 서로 다르다. */
  aspectRatio?: number;
};

/**
 * 비교 이미지 블록. `status` 4가지를 모두 다룬다. (API.md §6.4 · C-7 · PRD F-07)
 *
 * | status  | 처리 |
 * | ------- | ---- |
 * | SKIPPED | 아무것도 그리지 않는다 (참고 사진 미첨부 · 생성 안 함) |
 * | PENDING | 스켈레톤. 폴링이 끝나면 교체된다 |
 * | DONE    | 현재 / 고점 두 장 |
 * | FAILED  | 안내 문구만. 나머지 결과는 정상 노출 |
 *
 * **없는 이미지를 대신할 예시 사진을 넣지 않는다.** 사용자 사진과 무관한 그림을
 * "내 분석 결과"로 보여주면 AI가 만든 것으로 오해한다. (AGENTS.md 규칙 15 · 규칙 6)
 */
export function ComparisonImage({ image, aspectRatio = 1.5 }: Props) {
  if (image.status === 'SKIPPED') return null;

  if (image.status === 'PENDING') {
    return (
      <View style={[styles.placeholder, { aspectRatio }]}>
        <Text style={styles.placeholderText}>예상 이미지를 만들고 있어요…</Text>
      </View>
    );
  }

  if (image.status === 'FAILED' || !image.currentUrl || !image.peakUrl) {
    return (
      <View style={styles.notice}>
        <Text style={styles.noticeText}>예상 이미지는 생성하지 못했어요.{`\n`}아래 분석 결과는 정상적으로 확인할 수 있어요.</Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={styles.half}>
        <Image source={{ uri: image.currentUrl }} contentFit="cover" style={[styles.image, { aspectRatio: aspectRatio / 2 }]} accessibilityLabel="현재 모습" />
        <Text style={styles.caption}>현재</Text>
      </View>
      <View style={styles.half}>
        <Image source={{ uri: image.peakUrl }} contentFit="cover" style={[styles.image, { aspectRatio: aspectRatio / 2 }]} accessibilityLabel="고점 예상 모습" />
        <Text style={styles.caption}>고점</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1, gap: 6 },
  image: { width: '100%', borderRadius: radius.lg, backgroundColor: colors.surfaceSunken },
  caption: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  placeholder: { width: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, backgroundColor: colors.surfaceSunken },
  placeholderText: { ...typography.caption, color: colors.textMuted },
  notice: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceSunken },
  noticeText: { ...typography.caption, color: colors.textTertiary, lineHeight: 18 },
});
