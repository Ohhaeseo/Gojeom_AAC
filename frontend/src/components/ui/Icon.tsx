import Svg, { Path } from 'react-native-svg';

/**
 * 글자로 그리던 기호를 벡터로 바꾼 것.
 *
 * 🔴 **`✓`·`⌄`·`⚙` 같은 기호는 폰트에 없으면 네모(두부)로 깨진다.** 이 앱은 모든
 * 텍스트에 Pretendard를 지정하는데, 그 폰트에 없는 글리프는 기기마다 다른 대체
 * 폰트로 떨어진다 — 안드로이드에서는 아예 네모가 뜨기도 한다. 특히 `⌄`(U+2304)와
 * `⚙`(U+2699)은 빠져 있는 폰트가 흔하다.
 *
 * SVG로 그리면 **어느 기기에서도 같게 보인다.** 색과 크기는 부르는 쪽이 정한다.
 */
export type IconName =
  | 'check'
  | 'close'
  | 'gear'
  | 'chevronDown'
  | 'chevronRight'
  | 'caretUp'
  | 'caretDown'
  | 'caretLeft'
  | 'caretRight';

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  /** 선 굵기. 획으로 그리는 아이콘(check·close·chevron)에만 쓰인다. */
  weight?: number;
};

/** 획으로 그리는 것 — 굵기를 크기에 비례시켜야 작게 써도 뭉개지지 않는다. */
const STROKED: Record<string, string> = {
  check: 'M5 12.5l4.5 4.5L19 7',
  close: 'M6 6l12 12M18 6L6 18',
  chevronDown: 'M6 9.5l6 6 6-6',
  chevronRight: 'M9.5 6l6 6-6 6',
};

/** 면으로 그리는 것 — 순서·정렬 삼각형처럼 작고 또렷해야 하는 것들. */
const FILLED: Record<string, string> = {
  caretUp: 'M12 7.5l6.5 9h-13z',
  caretDown: 'M12 16.5l-6.5-9h13z',
  caretLeft: 'M7.5 12l9-6.5v13z',
  caretRight: 'M16.5 12l-9 6.5v-13z',
  // 톱니바퀴는 획으로 그리면 작은 크기에서 뭉개진다. 면으로 그린다.
  gear:
    'M19.14 12.94a7.07 7.07 0 0 0 .06-.94c0-.32-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.61'
    + 'l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.02 7.02 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42'
    + 'h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 0 0-.6.22'
    + 'L2.74 8.87a.5.5 0 0 0 .12.61l2.03 1.58c-.04.31-.06.62-.06.94s.02.63.06.94l-2.03 1.58'
    + 'a.5.5 0 0 0-.12.61l1.92 3.32c.13.22.38.3.6.22l2.39-.96c.49.38 1.03.7 1.62.94l.36 2.54'
    + 'c.04.24.25.42.5.42h3.84c.25 0 .46-.18.5-.42l.36-2.54c.59-.24 1.12-.56 1.62-.94l2.39.96'
    + 'c.22.08.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.61l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4'
    + 'a3.6 3.6 0 0 1 0 7.2z',
};

export function Icon({ name, size = 16, color = '#121D2D', weight }: IconProps) {
  const stroked = STROKED[name];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {stroked ? (
        <Path
          d={stroked}
          fill="none"
          stroke={color}
          // 크기에 비례시킨다. 고정 굵기면 12px 아이콘이 뭉개진다.
          strokeWidth={weight ?? Math.max(1.6, size * 0.14)}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <Path d={FILLED[name]} fill={color} />
      )}
    </Svg>
  );
}
