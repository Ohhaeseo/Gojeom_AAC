import type { TextStyle, ViewStyle } from 'react-native';

export const fonts = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
  extrabold: 'Pretendard-ExtraBold',
} as const;

export const colors = {
  primary: '#6BBDA6',
  primaryLight: '#A1D9C6',
  point: '#FC9EA0',
  danger: '#DE6569',
  error: '#DE6569',
  text: '#121D2D',
  textMuted: '#79889A',
  textTertiary: '#727876',
  background: '#F3FAF8',
  backgroundAlt: '#FAFFFE',
  surface: '#FAFFFE',
  surfaceSunken: '#E2EAE6',
  divider: '#E2EAE6',
  border: '#A1D9C6',
  disabled: '#C8D2CF',
  white: '#FFFFFF',
  overlay: '#121D2D',
  primaryPressed: '#4CA88E',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const layout = {
  /**
   * 시안 기준 폭. 데스크톱 브라우저에서 화면이 전체 폭으로 늘어나지 않게 막는다.
   *
   * `AppScreen`이 헤더·내용·하단 네비를 통째로 이 폭에 묶는다. 내용만 묶으면
   * 헤더와 네비가 따로 늘어나 어긋난다.
   */
  maxWidth: 458,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const typography = {
  display: { fontFamily: fonts.extrabold, fontWeight: '800', fontSize: 32, lineHeight: 40 } satisfies TextStyle,
  h1: { fontFamily: fonts.bold, fontWeight: '700', fontSize: 24, lineHeight: 32 } satisfies TextStyle,
  title: { fontFamily: fonts.bold, fontWeight: '700', fontSize: 20, lineHeight: 28 } satisfies TextStyle,
  subtitle: { fontFamily: fonts.semibold, fontWeight: '600', fontSize: 18, lineHeight: 25 } satisfies TextStyle,
  body: { fontFamily: fonts.regular, fontWeight: '400', fontSize: 15, lineHeight: 22 } satisfies TextStyle,
  label: { fontFamily: fonts.semibold, fontWeight: '600', fontSize: 16, lineHeight: 22 } satisfies TextStyle,
  caption: { fontFamily: fonts.regular, fontWeight: '400', fontSize: 12, lineHeight: 18 } satisfies TextStyle,
} as const;

export const shadow: ViewStyle = {
  shadowColor: colors.text,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 10,
  elevation: 4,
};
