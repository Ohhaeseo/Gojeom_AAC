import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AppScreen } from '@/components/layout/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';
import { useAppState } from '@/state/AppState';
import { colors, fonts, radius, shadow, spacing, typography } from '@/theme/tokens';
import type { Category } from '@/types/api';

/**
 * 카테고리별 목표 입력. **한 카테고리에 한 장씩** 넘어간다.
 *
 * `/routine-new`에서 카테고리와 기간을 고르면 고른 개수만큼 이 화면이 이어진다.
 * 마지막 장에서 실제 생성이 일어난다.
 *
 * <b>여기서 받는 것이 AI가 루틴을 고르는 근거다.</b> 같은 "체형 4주"라도
 * "근력을 키우고 싶다"와 "몸무게만 줄이고 싶다"는 다른 루틴이 나와야 한다.
 * 신체 정보와 우선순위만으로는 그 차이를 알 수 없다.
 */
const COPY: Record<Category, { label: string; title: string; lead: string; placeholder: string }> = {
  SKIN: {
    label: '피부',
    title: '피부에서 무엇을 바꾸고 싶나요?',
    lead: '고민을 적을수록 루틴이 구체적으로 나와요.',
    placeholder: '예) 모공을 줄이고 싶어요\n     여드름 자국이 오래 남아요\n     겨울마다 각질이 심해요',
  },
  BODY: {
    label: '체형',
    title: '체형은 어떻게 바꾸고 싶나요?',
    lead: '목표 몸무게와 원하는 방향을 알려주세요.',
    placeholder: '예) 근력을 키우고 싶어요\n     몸무게만 줄이고 싶어요\n     자세가 굽은 게 신경 쓰여요',
  },
  HEALTH: {
    label: '건강',
    title: '건강에서 신경 쓰이는 게 있나요?',
    lead: '지금 불편한 점이나 바라는 상태를 적어주세요.',
    placeholder: '예) 허리가 안 좋아요\n     밤에 자꾸 깨요\n     오후에 너무 피곤해요',
  },
};

export default function RoutineGoalScreen() {
  const { step } = useLocalSearchParams<{ step?: string }>();
  const { routineDraft, updateRoutineDraft, createRoutines } = useAppState();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const index = Math.max(0, Number(step ?? 0) || 0);
  const item = routineDraft[index];
  const last = index === routineDraft.length - 1;

  // 새로고침하면 작성 중인 계획이 메모리에서 사라진다. 빈 화면 대신 처음으로 돌려보낸다.
  if (!item) return (
    <AppScreen navigation contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>목표를 다시 골라주세요</Text>
        <Text style={styles.lead}>작성 중이던 내용이 사라졌어요. 카테고리부터 다시 시작할게요.</Text>
      </View>
      <AppButton label="카테고리 고르기" onPress={() => router.replace('/routine-new')} />
    </AppScreen>
  );

  const copy = COPY[item.category];
  const isBody = item.category === 'BODY';
  // 체형은 목표 몸무게가 있어야 넘어간다. 나머지는 문장만 있으면 된다.
  const weightOk = !isBody || (item.targetWeightKg != null && item.targetWeightKg >= 30 && item.targetWeightKg <= 200);
  const valid = Boolean(item.goalText?.trim()) && weightOk;

  const next = async () => {
    if (!last) {
      router.push({ pathname: '/routine-goal', params: { step: String(index + 1) } });
      return;
    }
    setPending(true); setError('');
    const outcome = await createRoutines(routineDraft);
    setPending(false);
    if (!outcome.ok) return setError(outcome.message ?? '목표를 만들지 못했어요.');
    router.replace('/routines');
  };

  return (
    <AppScreen navigation contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{copy.label} · {index + 1}/{routineDraft.length}</Text>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.lead}>{copy.lead}</Text>
      </View>

      {isBody ? (
        <FormField
          label="목표 몸무게"
          required
          value={item.targetWeightKg != null ? String(item.targetWeightKg) : ''}
          onChangeText={(value) => {
            // 소수점 한 자리까지. 서버가 NUMERIC(4,1)로 받는다.
            const cleaned = value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').replace(/(\.\d)\d+/, '$1');
            updateRoutineDraft('BODY', { targetWeightKg: cleaned ? Number(cleaned) : undefined });
            setError('');
          }}
          keyboardType="decimal-pad"
          placeholder="예: 62.5 (kg)"
          error={item.targetWeightKg != null && !weightOk ? '30~200kg 사이로 입력해주세요.' : undefined}
        />
      ) : null}

      <View style={styles.textArea}>
        <TextInput
          accessibilityLabel={`${copy.label} 목표`}
          multiline
          maxLength={300}
          textAlignVertical="top"
          value={item.goalText ?? ''}
          onChangeText={(value) => { updateRoutineDraft(item.category, { goalText: value }); setError(''); }}
          placeholder={copy.placeholder}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <Text style={styles.count}>{(item.goalText ?? '').length}/300</Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <AppButton
        label={pending ? '목표를 만들고 있어요...' : last ? '루틴 만들기' : '다음'}
        disabled={!valid || pending}
        onPress={next}
      />
      <Text style={styles.note}>적어주신 내용은 루틴을 만드는 데만 쓰여요.</Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  header: { gap: 6, marginBottom: 4 },
  eyebrow: { ...typography.label, color: colors.primary },
  title: { ...typography.h1, color: colors.text },
  lead: { ...typography.body, color: colors.textMuted },
  textArea: { aspectRatio: 3 / 2, overflow: 'hidden', borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.divider, backgroundColor: colors.surface, ...shadow },
  input: { flex: 1, paddingHorizontal: 15, paddingTop: 14, paddingBottom: 34, fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: colors.text },
  count: { position: 'absolute', right: 13, bottom: 12, ...typography.caption, color: colors.textMuted },
  errorText: { ...typography.caption, color: colors.danger, textAlign: 'center' },
  note: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
