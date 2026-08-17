import { Text, StyleSheet, type TextStyle } from 'react-native';

import { colors } from '@/theme/tokens';

type Props = {
  children: string;
  /** 강조할 말들. **사용자가 고른 키워드**를 넣는다. */
  keywords: string[];
  style?: TextStyle | TextStyle[];
};

/**
 * 문장 안에서 사용자가 고른 키워드를 굵게·강조색으로 칠한다.
 *
 * <p><b>기준은 사용자의 선택이다.</b> AI가 중요하다고 한 말이 아니라, 사용자가
 * 직접 고른 키워드만 강조한다. 그래야 "내가 고른 것이 결과에 이렇게 반영됐다"가
 * 눈에 보인다.
 *
 * <p>긴 키워드부터 찾는다. "큰 눈"과 "눈"이 함께 있을 때 짧은 쪽을 먼저 찾으면
 * 긴 쪽이 쪼개져 두 조각으로 칠해진다.
 */
export function KeywordText({ children, keywords, style }: Props) {
  const targets = keywords
    .map((word) => word.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  if (!targets.length) return <Text style={style}>{children}</Text>;

  const parts: { text: string; hit: boolean }[] = [];
  let rest = children;

  // 앞에서부터 가장 먼저 나오는 키워드를 찾아 자르기를 반복한다.
  while (rest.length) {
    let at = -1;
    let found = '';
    for (const word of targets) {
      const index = rest.indexOf(word);
      // 같은 위치라면 긴 키워드가 이긴다 (targets가 이미 긴 것부터다).
      if (index !== -1 && (at === -1 || index < at)) { at = index; found = word; }
    }
    if (at === -1) { parts.push({ text: rest, hit: false }); break; }
    if (at > 0) parts.push({ text: rest.slice(0, at), hit: false });
    parts.push({ text: found, hit: true });
    rest = rest.slice(at + found.length);
  }

  return (
    <Text style={style}>
      {parts.map((part, index) => (
        <Text key={`${index}-${part.text}`} style={part.hit ? styles.hit : undefined}>{part.text}</Text>
      ))}
    </Text>
  );
}

const styles = StyleSheet.create({
  hit: { color: colors.primaryPressed, fontWeight: '700' },
});
