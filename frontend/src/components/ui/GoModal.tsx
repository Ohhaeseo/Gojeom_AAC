import { useEffect, useState, type PropsWithChildren } from 'react';
import { AccessibilityInfo, Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';

import { colors, radius, spacing, typography } from '@/theme/tokens';

type GoModalProps = PropsWithChildren<{
  visible: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  destructive?: boolean;
  confirmDisabled?: boolean;
}>;

export function GoModal({
  visible,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  destructive = false,
  confirmDisabled = false,
  children,
}: GoModalProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!visible) return;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: reduceMotion ? 0 : 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress, reduceMotion, visible]);

  const dismiss = (callback: () => void) => {
    if (reduceMotion) {
      callback();
      return;
    }
    Animated.timing(progress, { toValue: 0, duration: 150, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(callback);
  };

  return (
    <Modal animationType="none" transparent statusBarTranslucent visible={visible} onRequestClose={() => dismiss(onClose)}>
      <View style={styles.root}>
        <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.dim, { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] }) }]} />
        <Pressable accessibilityRole="button" accessibilityLabel="팝업 닫기" onPress={() => dismiss(onClose)} style={StyleSheet.absoluteFill} />
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.card,
            {
              opacity: progress,
              transform: [
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
                { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
              ],
            },
          ]}
        >
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          {children}
          <View style={styles.actions}>
            {destructive ? <Pressable accessibilityRole="button" onPress={() => dismiss(onClose)} style={styles.confirmButton}><Text style={styles.confirmText}>되돌아가기</Text></Pressable> : null}
            <Pressable accessibilityRole="button" disabled={confirmDisabled} onPress={() => dismiss(onConfirm)} style={[styles.confirmButton, destructive && styles.destructiveButton, confirmDisabled && styles.disabledButton]}><Text style={[styles.confirmText, destructive && styles.destructiveText]}>{confirmLabel}</Text></Pressable>
            {!destructive ? <Pressable accessibilityRole="button" onPress={() => dismiss(onClose)} style={styles.cancelButton}><Text style={styles.cancelText}>취소</Text></Pressable> : null}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  dim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#121D2D' },
  card: {
    width: '100%',
    maxWidth: 360,
    minHeight: 250,
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: 19,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    shadowColor: '#121D2D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  title: { ...typography.title, color: colors.text, textAlign: 'left' },
  description: { ...typography.body, color: colors.textMuted, textAlign: 'left' },
  actions: { gap: spacing.sm, marginTop: 'auto' },
  cancelButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: '#E2EAE6' },
  confirmButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.primary },
  destructiveButton: { borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.surface },
  cancelText: { ...typography.label, color: colors.text },
  confirmText: { ...typography.label, color: colors.white },
  destructiveText: { color: colors.danger },
  disabledButton: { opacity: 0.42 },
});
