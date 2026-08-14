import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/layout/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useAppState } from '@/state/AppState';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function PhotoScreen() {
  const { photoUri, setPhotoUri } = useAppState();
  const [permissionDenied, setPermissionDenied] = useState(false);

  const selectPhoto = async () => {
    setPermissionDenied(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPermissionDenied(true);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.9,
    });
    if (!result.canceled) { setPhotoUri(result.assets[0]?.uri); router.push('/priority'); }
  };

  return (
    <AppScreen navigation contentStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>내 사진 등록하기</Text>
        <Text style={styles.description}>얼굴을 등록하고 AI 분석 결과를 확인해보세요.</Text>
      </View>

      <Pressable onPress={selectPhoto} style={styles.preview}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.image} accessibilityLabel="선택한 얼굴 사진" />
        ) : (
          <View style={styles.placeholderWrap}><BrandLogo variant="face" style={styles.faceLogo} /><Text style={styles.photoTitle}>사진 추가</Text><Text style={styles.placeholder}>이곳을 눌러 파일을 업로드 하거나,{`\n`}촬영을 시작해 보세요.</Text></View>
        )}
      </Pressable>

      <Text style={styles.notes}>*기본 카메라, 후면 촬영 사진이 가장 정확도 높아요.{`\n`}*정면을 바라본 상반신의 무보정 원본 사진을 권장해요.{`\n`}*사진은 분석 목적으로만 사용되며 다른 사용자에게 공개되지 않아요.</Text>

      {permissionDenied && (
        <View style={styles.error}>
          <Text style={styles.errorText}>사진 권한이 꺼져 있어요. 설정에서 권한을 허용한 뒤 다시 시도해주세요.</Text>
          <AppButton label="설정 열기" variant="secondary" onPress={() => Linking.openSettings()} />
        </View>
      )}

    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  header: { gap: spacing.sm },
  title: { ...typography.title, color: colors.text },
  description: { ...typography.body, color: colors.textMuted },
  preview: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderColor: colors.textMuted,
    borderStyle: 'dashed',
    borderWidth: 1,
    backgroundColor: '#E1E8E7',
  },
  image: { width: '100%', height: '100%' },
  placeholderWrap: { alignItems: 'center', gap: 6 }, faceLogo: { width: 150, height: 112 }, photoTitle: { ...typography.title, color: colors.text },
  placeholder: { ...typography.body, color: colors.textMuted, textAlign: 'center' }, notes: { ...typography.caption, color: colors.textTertiary },
  error: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: '#FFF0F1' },
  errorText: { ...typography.caption, color: colors.error },
});
