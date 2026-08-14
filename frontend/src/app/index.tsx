import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MorphingBrandLogo } from '@/components/brand/MorphingBrandLogo';
import { colors } from '@/theme/tokens';

export default function SplashScreen() {
  useEffect(() => {
    const timer = setTimeout(() => router.replace('/auth'), 2450);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}>
        <MorphingBrandLogo />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.backgroundAlt }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
