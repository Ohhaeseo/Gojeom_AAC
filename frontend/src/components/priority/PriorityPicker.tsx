import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme/tokens';
import type { Category } from '@/types/api';

export const priorityCategories: Category[] = ['SKIN', 'BODY', 'HEALTH'];
export type PriorityCategory = Category;
export const priorityLabels: Record<Category, string> = { SKIN: '피부', BODY: '체형', HEALTH: '건강' };

type PriorityPickerProps = {
  selected: PriorityCategory[];
  onChange: (next: PriorityCategory[]) => void;
};

function SelectedPriority({
  category,
  onRemove,
}: {
  category: PriorityCategory;
  onRemove: () => void;
}) {
  const [progress] = useState(() => new Animated.Value(0));
  const removing = useRef(false);

  useEffect(() => {
    Animated.spring(progress, {
      toValue: 1,
      damping: 15,
      stiffness: 210,
      mass: 0.75,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const remove = () => {
    if (removing.current) return;
    removing.current = true;
    Animated.timing(progress, {
      toValue: 0,
      duration: 170,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(onRemove);
  };

  return (
    <Animated.View
      style={[
        styles.selectedCard,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
            },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
          ],
        },
      ]}
    >
      <Text style={styles.selectedText}>{priorityLabels[category]}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${priorityLabels[category]} 우선순위 삭제`} hitSlop={10} onPress={remove} style={styles.removeButton}>
        <Text style={styles.removeText}>×</Text>
      </Pressable>
    </Animated.View>
  );
}

export function PriorityPicker({ selected, onChange }: PriorityPickerProps) {
  const commit = (next: PriorityCategory[]) => {
    LayoutAnimation.configureNext({
      duration: 240,
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
    onChange(next);
  };
  const toggle = (category: PriorityCategory) => {
    if (selected.includes(category)) {
      commit(selected.filter((item) => item !== category));
      return;
    }

    if (selected.length < 3) commit([...selected, category]);
  };

  return (
    <View style={styles.root}>
      <View style={styles.rankingArea}>
        {[0, 1, 2].map((index) => {
          const category = selected[index];
          return <View key={index} style={styles.rankSlot}>
            {category ? <SelectedPriority key={category} category={category} onRemove={() => commit(selected.filter((item) => item !== category))} /> : <View style={styles.emptySlot} />}
            <Text style={styles.rankText}>{index + 1}순위</Text>
          </View>;
        })}
      </View>

      <Text style={styles.placeholder}>원하는 순서대로 눌러주세요</Text>

      <View style={styles.optionGrid}>
        {priorityCategories.map((category) => {
          const rank = selected.indexOf(category);
          const isSelected = rank !== -1;
          const isFull = selected.length === 3;
          return (
            <Pressable
              key={category}
              accessibilityRole="checkbox"
              accessibilityLabel={`${priorityLabels[category]}${isSelected ? ` ${rank + 1}순위로 선택됨` : ''}`}
              accessibilityState={{ checked: isSelected, disabled: !isSelected && isFull }}
              disabled={!isSelected && isFull}
              onPress={() => toggle(category)}
              style={({ pressed }) => [
                styles.option,
                isSelected && styles.optionSelected,
                !isSelected && isFull && styles.optionDisabled,
                pressed && styles.optionPressed,
              ]}
            >
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{priorityLabels[category]}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.lg },
  rankingArea: {
    minHeight: 102,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  rankSlot: { flex: 1, alignItems: 'center', gap: 8 },
  placeholder: { ...typography.caption, color: colors.textMuted, alignSelf: 'center', textAlign: 'center', marginTop: -10 },
  selectedCard: {
    width: 88,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    backgroundColor: colors.primary,
    shadowColor: '#64837B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 2,
  },
  rankText: { ...typography.caption, color: colors.textMuted, fontWeight: '700' },
  emptySlot: { width: 88, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.disabled },
  emptyText: { ...typography.caption, color: colors.disabled },
  selectedText: { ...typography.label, color: colors.white },
  removeButton: { position: 'absolute', right: -5, top: -6, alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: colors.point, backgroundColor: colors.white },
  removeText: { color: colors.danger, fontSize: 18, lineHeight: 19, fontWeight: '400' },
  optionGrid: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  option: {
    width: 82,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  optionSelected: { backgroundColor: '#BFC1C1' },
  optionDisabled: { opacity: 0.42 },
  optionPressed: { transform: [{ scale: 0.97 }] },
  optionText: { ...typography.label, color: colors.white },
  optionTextSelected: { color: colors.white },
});
