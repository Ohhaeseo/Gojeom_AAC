import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { OfficialFaceLogo } from '@/components/brand/OfficialLogos';
import { colors, radius, shadow, typography } from '@/theme/tokens';
import type { Category } from '@/types/api';

const labels: Record<Category, string> = { SKIN: '피부', BODY: '체형', HEALTH: '건강' };

export function ProfilePhotoPanel({ photoUri, editable = true }: { photoUri?: string; editable?: boolean }) {
  return <><View style={styles.photoPanel}>{photoUri ? <Image source={{ uri: photoUri }} contentFit="cover" style={styles.photo} /> : <OfficialFaceLogo size={150} showCircle={false} style={styles.face} />}{!photoUri ? <><Text style={styles.photoTitle}>사진 추가</Text><Text style={styles.photoDescription}>이곳을 눌러 파일을 업로드 하거나,{`\n`}촬영을 시작해 보세요.</Text></> : null}</View>{editable ? <AppButton label={photoUri ? '사진 다시 등록하기' : '사진 등록하기'} variant="dark" onPress={() => router.push('/photo')} /> : null}</>;
}

export function PrioritySummary({ priorities, onRemove }: { priorities: Category[]; onRemove?: (category: Category) => void }) {
  return <View style={styles.priorityRow}>{priorities.map((category, index) => <View key={category} style={styles.priorityColumn}><View style={styles.priorityPill}><Text style={styles.priorityText}>{labels[category]}</Text>{onRemove ? <Pressable hitSlop={8} onPress={() => onRemove(category)} style={styles.remove}><Text style={styles.removeText}>×</Text></Pressable> : null}</View><Text style={styles.rank}>{index + 1}순위</Text></View>)}</View>;
}

const styles = StyleSheet.create({ photoPanel: { height: 300, alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.textMuted, borderRadius: radius.lg, backgroundColor: '#E1E8E7' }, photo: { width: '100%', height: '100%' }, face: { width: 150, height: 112 }, photoTitle: { ...typography.title, color: colors.text }, photoDescription: { ...typography.body, color: colors.textMuted, textAlign: 'center' }, priorityRow: { flexDirection: 'row', justifyContent: 'space-around', gap: 12 }, priorityColumn: { flex: 1, alignItems: 'center', gap: 8 }, priorityPill: { width: 86, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.primary, ...shadow }, priorityText: { ...typography.label, color: colors.white }, rank: { ...typography.label, color: colors.textMuted }, remove: { position: 'absolute', right: -5, top: -6, width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 11, borderWidth: 1, borderColor: colors.point, backgroundColor: colors.white }, removeText: { color: colors.danger, fontSize: 18, lineHeight: 19 } });
