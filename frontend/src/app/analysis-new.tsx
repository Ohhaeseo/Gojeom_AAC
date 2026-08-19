import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { OfficialFaceLogo } from '@/components/brand/OfficialLogos';
import { AppScreen } from '@/components/layout/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { SubscribeModal } from '@/components/subscription/SubscribeModal';
import { useAppState } from '@/state/AppState';
import { colors, fonts, radius, shadow, spacing, typography } from '@/theme/tokens';

const MAX_IMAGES = 4;

export default function AnalysisNewScreen() {
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [planOpen, setPlanOpen] = useState(false);
  const { width } = useWindowDimensions();
  const thumbnailSize = Math.round(Math.max(116, Math.min(150, (width - 58) * 0.375)));

  /**
   * 분석권 상태를 **들어올 때 미리** 확인한다.
   *
   * 예전에는 사진과 글을 다 채우고 `진단하기`를 누른 뒤에야 402로 막혔다.
   * 두 번째 분석을 하려던 사람이 공들여 입력한 것을 잃는 자리였다.
   * 여기서 미리 알면 바로 요금제로 갈 수 있다.
   */
  const { subscription, loadSubscription } = useAppState();
  useFocusEffect(useCallback(() => { void loadSubscription(); }, [loadSubscription]));

  const blocked = subscription?.canAnalyze === false;

  // 못 하는 상태로 들어왔으면 폼을 채우기 전에 알린다.
  useEffect(() => { if (blocked) setPlanOpen(true); }, [blocked]);

  const startAnalysis = () => {
    // 서버가 최종 판단이지만, 여기서 먼저 막아 헛수고를 없앤다.
    if (blocked) { setPlanOpen(true); return; }
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

      {/*
        고른 사진이 있으면 **이 자리에 보여준다.** 예전에는 항상 빈 안내만 그려서,
        사진을 골라도 큰 패널은 그대로이고 아래 줄에만 나타나 "왜 위가 아니라
        아래로 들어가지" 하게 됐다. 고른 것은 고른 자리에 보여야 한다.
      */}
      <Pressable accessibilityRole="button" accessibilityLabel={images.length ? `참고 사진 ${images.length}장 · 더 추가하기` : '분석 참고 사진 추가'} onPress={pickImages} style={styles.uploadPanel}>
        {images.length ? (
          <>
            {/* **마지막에 추가한 사진**을 보여준다. 방금 고른 것이 큰 자리에 떠야 자연스럽다. */}
            {/*
              🔴 `cover`가 아니라 `contain`이다. 패널이 4:3 가로인데 폰 사진은 대개
              세로라, `cover`로 채우면 폭에 맞춰 확대되며 **위아래가 잘린다.**
              얼굴은 사진 위쪽에 있으니 머리가 날아간다 — 헤어를 참고하려고 올린
              사진에서 헤어가 안 보이는 셈이다. 남는 여백은 패널 배경색이 받는다.
            */}
            <Image source={{ uri: images[images.length - 1] }} contentFit="contain" style={styles.uploadPreview} />
            <View style={styles.uploadBadge}>
              <Text style={styles.uploadBadgeText}>{images.length < MAX_IMAGES ? `${images.length}/${MAX_IMAGES} · 눌러서 더 추가` : `${MAX_IMAGES}장 모두 채웠어요 · 아래에서 삭제`}</Text>
            </View>
          </>
        ) : (
          <>
            {/* 로고가 **남은 높이만** 가져간다. 고정 크기로 두면 글꼴이 커질 때
                `overflow: hidden`인 이 패널이 로고 위쪽을 잘라 낸다. */}
            <View style={styles.uploadLogo}><OfficialFaceLogo size={150} showCircle={false} style={styles.fillLogo} /></View>
            <Text style={styles.photoTitle}>사진 추가</Text>
            <Text style={styles.photoDescription}>이곳을 눌러 파일을 업로드 하거나,{`\n`}촬영을 시작해 보세요.</Text>
          </>
        )}
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
              {/* 썸네일도 정사각형이라 `cover`면 세로 사진의 머리가 잘린다. */}
              {uri ? <Image source={{ uri }} contentFit="contain" style={styles.thumbnailImage} /> : <OfficialFaceLogo size={thumbnailSize * 0.68} showCircle={false} />}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 막힌 상태를 버튼에도 적는다. 눌러 보고 알게 하지 않는다. */}
      {blocked ? (
        <View style={styles.blockedNote}>
          <Text style={styles.blockedTitle}>분석권을 모두 사용했어요</Text>
          <Text style={styles.blockedBody}>구독하면 고점 분석을 횟수 제한 없이 이용할 수 있어요.</Text>
          <Text accessibilityRole="button" accessibilityLabel="요금제 보기" onPress={() => router.push('/plan')} style={styles.blockedLink}>요금제 보기 〉</Text>
        </View>
      ) : null}

      <AppButton
        label={blocked ? '구독하고 분석하기' : '진단하기'}
        onPress={startAnalysis}
        style={styles.submit}
      />

      <SubscribeModal
        visible={planOpen}
        onClose={() => setPlanOpen(false)}
        onSubscribed={() => { setPlanOpen(false); void loadSubscription(); }}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blockedNote: { gap: 4, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primaryLight, backgroundColor: colors.primaryBg },
  blockedTitle: { ...typography.label, color: colors.text },
  blockedBody: { ...typography.caption, color: colors.textTertiary },
  blockedLink: { ...typography.caption, color: colors.primaryPressed, marginTop: 2 },
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
  uploadPanel: { aspectRatio: 4 / 3, marginTop: 8, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12, overflow: 'hidden', borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.textTertiary, backgroundColor: '#E1E8E7' },
  // 원본 비율(164:126)을 지키며 남은 높이에 맞춰 줄어든다. 자세한 이유는 `AnalysisLogo`.
  uploadLogo: { flex: 1, aspectRatio: 164 / 126, maxHeight: 115, minHeight: 40, alignSelf: 'center' },
  fillLogo: { width: '100%', height: '100%' },
  uploadPreview: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  uploadBadge: { position: 'absolute', left: 12, bottom: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: 'rgba(18,29,45,0.62)' },
  uploadBadgeText: { ...typography.caption, color: colors.white },
  photoTitle: { marginTop: 1, ...typography.title, color: colors.text },
  photoDescription: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  notes: { marginTop: 9, ...typography.caption, color: colors.textTertiary, lineHeight: 17 },
  thumbnailScroller: { marginHorizontal: -29, marginTop: 16 },
  thumbnailRow: { paddingHorizontal: 29, gap: 28 },
  thumbnail: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.textTertiary, backgroundColor: '#E1E8E7' },
  thumbnailImage: { width: '100%', height: '100%' },
  submit: { marginTop: 16, marginBottom: spacing.md },
});
