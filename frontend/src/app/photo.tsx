import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/layout/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { OfficialFaceLogo } from '@/components/brand/OfficialLogos';
import { useAppState } from '@/state/AppState';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function PhotoScreen() {
  const { photoUri, setPhotoUri, changePhoto, profile } = useAppState();
  const [permissionDenied, setPermissionDenied] = useState(false);

  /*
    🔴 **사진만 바꾸러 온 길.** (`profile.tsx`의 "사진 변경")

    예전에는 이 화면이 언제나 온보딩의 첫 칸이라, 사진을 바꾸려고 들어와도
    `/priority` → `/body-info` → `/optional-info`로 이어져 **키·체중·수면을 전부
    다시 입력해야** 했다. 프로필이 이미 있으면 여기서 끝낸다.
  */
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const changing = edit === '1' && Boolean(profile);
  /** 변경 모드에서 방금 고른 사진. 누르기 전까지 서버에 보내지 않는다. */
  const [picked, setPicked] = useState<string>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

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
    if (result.canceled) return;
    const uri = result.assets[0]?.uri;
    if (!uri) return;

    // 변경 모드에서는 **고른 것을 먼저 보여준다.** 검증에 몇 초 걸리는 데다,
    // 무엇을 고른지 확인하지 못한 채 바뀌면 되돌릴 방법을 찾게 된다.
    if (changing) { setPicked(uri); setError(''); return; }
    setPhotoUri(uri);
    router.push('/priority');
  };

  const submitChange = async () => {
    if (!picked || pending) return;
    setPending(true); setError('');
    const outcome = await changePhoto(picked);
    setPending(false);
    // 얼굴이 없거나 흐린 사진이면 서버가 이유를 준다. 그대로 보여준다.
    if (!outcome.ok) return setError(outcome.message ?? '사진을 바꾸지 못했어요.');
    router.replace('/profile');
  };

  return (
    <AppScreen navigation contentStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{changing ? '사진 변경하기' : '내 사진 등록하기'}</Text>
        <Text style={styles.description}>
          {changing
            ? '새 사진만 고르면 돼요. 키·체중·수면 정보는 그대로 남아요.'
            : '얼굴을 등록하고 AI 분석 결과를 확인해보세요.'}
        </Text>
      </View>

      <Pressable onPress={selectPhoto} style={styles.preview}>
        {picked ?? photoUri ? (
          <Image source={{ uri: (picked ?? photoUri) as string }} style={styles.image} accessibilityLabel="선택한 얼굴 사진" />
        ) : (
          <View style={styles.placeholderWrap}><View style={styles.faceLogo}><OfficialFaceLogo size={150} showCircle={false} style={styles.fillLogo} /></View><Text style={styles.photoTitle}>사진 추가</Text><Text style={styles.placeholder}>이곳을 눌러 파일을 업로드 하거나,{`\n`}촬영을 시작해 보세요.</Text></View>
        )}
      </Pressable>

      <Text style={styles.notes}>*기본 카메라, 후면 촬영 사진이 가장 정확도 높아요.{`\n`}*정면을 바라본 상반신의 무보정 원본 사진을 권장해요.{`\n`}*사진은 분석 목적으로만 사용되며 다른 사용자에게 공개되지 않아요.</Text>

      {changing ? (
        <AppButton
          label={pending ? '바꾸는 중...' : '이 사진으로 변경하기'}
          disabled={!picked || pending}
          onPress={submitChange}
        />
      ) : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

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
  // 패널이 `overflow: hidden`이라 내용이 넘치면 로고가 잘린다. 높이를 패널에 맞추고
  // 로고가 남은 높이만 가져가게 해서 잘릴 자리를 없앤다. (`AnalysisLogo`와 같은 방식)
  placeholderWrap: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.md, paddingHorizontal: spacing.md },
  faceLogo: { flex: 1, aspectRatio: 164 / 126, maxHeight: 112, minHeight: 40, alignSelf: 'center' },
  fillLogo: { width: '100%', height: '100%' },
  photoTitle: { ...typography.title, color: colors.text },
  placeholder: { ...typography.body, color: colors.textMuted, textAlign: 'center' }, notes: { ...typography.caption, color: colors.textTertiary },
  error: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: '#FFF0F1' },
  errorText: { ...typography.caption, color: colors.error },
});
