import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { OfficialFaceLogo } from '@/components/brand/OfficialLogos';
import { AppScreen } from '@/components/layout/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { colors, fonts, radius, shadow, spacing, typography } from '@/theme/tokens';

const MAX_IMAGES = 4;

export default function AnalysisNewScreen() {
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const { width } = useWindowDimensions();
  const thumbnailSize = Math.round(Math.max(116, Math.min(150, (width - 58) * 0.375)));

  const startAnalysis = () => {
    if (!text.trim()) {
      Alert.alert('추구하는 모습을 적어주세요', '짧은 문장이나 단어로도 시작할 수 있어요.');
      return;
    }
    router.push({ pathname: '/analysis-progress', params: { input: text.trim(), images: JSON.stringify(images) } });
  };

  const pickImages = async () => {
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) return Alert.alert('이미지는 최대 4장까지 추가할 수 있어요.');

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('사진 접근 권한이 필요해요', '아이폰 설정에서 사진 접근을 허용한 뒤 다시 시도해주세요.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      orderedSelection: true,
      quality: 0.9,
    });
    if (!result.canceled) {
      setImages((current) => [...current, ...result.assets.map((asset) => asset.uri)].slice(0, MAX_IMAGES));
    }
  };

  return (
    <AppScreen navigation contentStyle={styles.content}>
      <View style={styles.heading}>
        <Text style={styles.title}>고점 분석하기</Text>
        <Text style={styles.description}>내가 생각하는 이상적인 모습을 자유롭게 적어주세요.<Text style={styles.required}>*</Text></Text>
      </View>

      <View style={styles.textArea}>
        <TextInput
          accessibilityLabel="추구하는 모습"
          multiline
          maxLength={500}
          textAlignVertical="top"
          value={text}
          onChangeText={setText}
          placeholder={'예) 짧은 문장이나 단어.\n     자연스럽고 건강해 보이는 분위기, 깔끔하고 단정한 인상'}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <Text style={styles.count}>최대 500자.</Text>
      </View>

      <View style={styles.photoHeading}>
        <Text style={styles.sectionTitle}>사진으로 등록하기</Text>
        <Text style={styles.description}>사진이 있다면 더 분석이 정확해져요.</Text>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="분석 참고 사진 추가" onPress={pickImages} style={styles.uploadPanel}>
        <OfficialFaceLogo size={150} showCircle={false} />
        <Text style={styles.photoTitle}>사진 추가</Text>
        <Text style={styles.photoDescription}>이곳을 눌러 파일을 업로드 하거나,{`\n`}촬영을 시작해 보세요.</Text>
      </Pressable>

      <Text style={styles.notes}>*기본 카메라, 후면 촬영 사진이 가장 정확도 높아요.{`\n`}*정면을 바라본 상반신 사진을 권장해요.{`\n`}*사진은 분석 목적으로만 사용되며 다른 사용자에게 공개되지 않아요.</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailRow} style={styles.thumbnailScroller}>
        {Array.from({ length: Math.max(3, images.length) }, (_, index) => {
          const uri = images[index];
          return (
            <Pressable
              key={uri ?? `empty-${index}`}
              accessibilityRole="button"
              accessibilityLabel={uri ? `${index + 1}번째 사진 삭제` : '사진 추가'}
              onPress={uri ? () => setImages((current) => current.filter((_, imageIndex) => imageIndex !== index)) : pickImages}
              style={[styles.thumbnail, { width: thumbnailSize, height: thumbnailSize }]}
            >
              {uri ? <Image source={{ uri }} contentFit="cover" style={styles.thumbnailImage} /> : <OfficialFaceLogo size={thumbnailSize * 0.68} showCircle={false} />}
            </Pressable>
          );
        })}
      </ScrollView>

      <AppButton label="진단하기" onPress={startAnalysis} style={styles.submit} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 29, paddingTop: 8, gap: 0 },
  heading: { gap: 3 },
  title: { ...typography.h1, color: colors.text },
  description: { ...typography.body, color: colors.textTertiary },
  required: { color: colors.danger },
  textArea: { aspectRatio: 4 / 3, marginTop: 8, overflow: 'hidden', borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.divider, backgroundColor: colors.backgroundAlt, ...shadow },
  input: { flex: 1, paddingHorizontal: 15, paddingTop: 14, paddingBottom: 38, fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: colors.text },
  count: { position: 'absolute', right: 13, bottom: 12, ...typography.caption, color: colors.textMuted },
  photoHeading: { gap: 2, marginTop: 16 },
  sectionTitle: { ...typography.h1, color: colors.text },
  uploadPanel: { aspectRatio: 4 / 3, marginTop: 8, alignItems: 'center', justifyContent: 'center', gap: 4, overflow: 'hidden', borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.textTertiary, backgroundColor: '#E1E8E7' },
  photoTitle: { marginTop: 1, ...typography.title, color: colors.text },
  photoDescription: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  notes: { marginTop: 9, ...typography.caption, color: colors.textTertiary, lineHeight: 17 },
  thumbnailScroller: { marginHorizontal: -29, marginTop: 16 },
  thumbnailRow: { paddingHorizontal: 29, gap: 28 },
  thumbnail: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.textTertiary, backgroundColor: '#E1E8E7' },
  thumbnailImage: { width: '100%', height: '100%' },
  submit: { marginTop: 16, marginBottom: spacing.md },
});
