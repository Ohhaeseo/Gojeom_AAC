import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { OfficialFaceLogo, OfficialWordmark } from './OfficialLogos';

type BrandLogoProps = { variant?: 'wordmark' | 'face'; style?: StyleProp<ViewStyle> };

export function BrandLogo({ variant = 'wordmark', style }: BrandLogoProps) {
  if (variant === 'face') {
    return <OfficialFaceLogo size={148} showCircle={false} style={[styles.face, style]} />;
  }

  return <View style={[styles.wordmark, style]}><OfficialWordmark width={82} height={37} /></View>;
}

const styles = StyleSheet.create({ wordmark: { width: 82, height: 42, justifyContent: 'center' }, face: { width: 148, height: 94 } });
