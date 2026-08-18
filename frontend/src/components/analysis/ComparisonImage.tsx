import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadow, spacing, typography } from '@/theme/tokens';
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

  return <CompareSlider currentUrl={image.currentUrl} peakUrl={image.peakUrl} aspectRatio={aspectRatio / 2} />;
}

/**
 * 겹쳐 놓고 가운데 손잡이로 갈라 보는 비교.
 *
 * <p>두 장을 나란히 두면 <b>같은 자리를 견주기 어렵다</b> — 눈은 왼쪽 볼과 오른쪽
 * 볼을 오가야 한다. 한 자리에 겹쳐 두고 경계를 옮기면 같은 지점이 어떻게 달라지는지
 * 바로 보인다.
 *
 * <p><b>`PanResponder`로 직접 만든다.</b> 웹에서 끌기를 붙이는 라이브러리는 대개
 * `findNodeHandle`을 쓰는데 RN Web에 그 API가 없어 조용히 아무 일도 하지 않는다.
 * (오답 노트 N-13)
 *
 * <p><b>비율은 `dx`로 누적한다.</b> 손가락의 화면 좌표(`moveX`)로 계산하려면 이
 * 뷰가 화면 어디에 있는지 재야 하는데, 스크롤하면 그 값이 바뀐다. 잡은 순간의
 * 비율에 이동량만 더하면 위치를 몰라도 된다.
 *
 * <p><b>끌기 말고도 길을 하나 더 둔다.</b> 아래 `현재`·`고점`을 누르면 끝으로
 * 붙는다. 끌기가 안 먹는 환경에서도 두 장을 다 볼 수 있어야 한다. (N-13)
 */
function CompareSlider({ currentUrl, peakUrl, aspectRatio }: { currentUrl: string; peakUrl: string; aspectRatio: number }) {
  const [width, setWidth] = useState(0);
  const [ratio, setRatio] = useState(0.5);
  // PanResponder 안에서는 state가 만들어진 시점 값으로 굳는다. 최신 값을 ref로 읽는다.
  const live = useRef({ width: 0, start: 0.5 });
  live.current.width = width;

  // onPanResponderGrant가 최신 비율을 봐야 한다. state를 그대로 읽으면 첫 값에 묶인다.
  const ratioRef = useRef(ratio);
  ratioRef.current = ratio;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { live.current.start = ratioRef.current; },
      onPanResponderMove: (_event, gesture) => {
        const box = live.current.width;
        if (!box) return;
        const next = live.current.start + gesture.dx / box;
        setRatio(Math.min(1, Math.max(0, next)));
      },
    }),
  ).current;

  return (
    <View style={styles.wrap}>
      <View
        style={[styles.stage, { aspectRatio }]}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        {...responder.panHandlers}
      >
        {/* 뒤: 고점. 앞의 현재 사진을 잘라내면 이것이 드러난다. */}
        <Image source={{ uri: peakUrl }} contentFit="cover" style={styles.layer} accessibilityLabel="고점 예상 모습" />
        {/*
          앞: 현재. **너비를 잘라** 왼쪽만 남긴다. 사진 자체를 줄이면 얼굴이 눌리므로
          바깥 View만 좁히고 사진은 무대 너비 그대로 둔다.
        */}
        <View style={[styles.clip, { width: `${ratio * 100}%` }]}>
          <Image
            source={{ uri: currentUrl }}
            contentFit="cover"
            style={[styles.layer, width ? { width } : null]}
            accessibilityLabel="현재 모습"
          />
        </View>
        <View style={[styles.handle, { left: `${ratio * 100}%` }]} pointerEvents="none">
          <View style={styles.handleLine} />
          <View style={styles.handleKnob}><Text style={styles.handleKnobText}>◀ ▶</Text></View>
        </View>
      </View>
      <View style={styles.captions}>
        <Pressable accessibilityRole="button" accessibilityLabel="현재 모습만 보기" onPress={() => setRatio(1)} hitSlop={8}>
          <Text style={[styles.caption, ratio > 0.5 && styles.captionOn]}>현재</Text>
        </Pressable>
        <Text style={styles.captionHint}>가운데를 끌어 비교해보세요</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="고점 예상 모습만 보기" onPress={() => setRatio(0)} hitSlop={8}>
          <Text style={[styles.caption, ratio < 0.5 && styles.captionOn]}>고점</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  stage: { width: '100%', borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceSunken },
  layer: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  clip: { ...StyleSheet.absoluteFillObject, right: undefined, overflow: 'hidden' },
  handle: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1, alignItems: 'center', justifyContent: 'center' },
  handleLine: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.white, opacity: 0.9 },
  handleKnob: { width: 44, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.white, ...shadow },
  handleKnobText: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
  captions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  captionOn: { color: colors.primary, fontWeight: '700' },
  captionHint: { ...typography.caption, color: colors.textTertiary, fontSize: 11 },
  caption: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  placeholder: { width: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, backgroundColor: colors.surfaceSunken },
  placeholderText: { ...typography.caption, color: colors.textMuted },
  notice: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceSunken },
  noticeText: { ...typography.caption, color: colors.textTertiary, lineHeight: 18 },
});
