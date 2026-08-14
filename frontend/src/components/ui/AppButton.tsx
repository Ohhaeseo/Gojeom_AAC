import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { colors, radius, shadow, spacing, typography } from '@/theme/tokens';

type AppButtonProps = PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary' | 'dark' | 'outline' | 'danger';
};

export function AppButton({ label, variant = 'primary', disabled, style, ...props }: AppButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => [
        styles.base,
        styles[variant],
        state.pressed && styles.pressed,
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      <Text style={[styles.label, (variant === 'secondary' || variant === 'outline') && styles.secondaryLabel, variant === 'danger' && styles.dangerLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    ...shadow,
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.disabled },
  dark: { backgroundColor: colors.text },
  outline: { backgroundColor: colors.backgroundAlt, borderColor: colors.primary, borderWidth: 1 },
  danger: { backgroundColor: colors.backgroundAlt, borderColor: colors.danger, borderWidth: 1 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.42, shadowOpacity: 0 },
  label: { ...typography.label, color: colors.white },
  secondaryLabel: { color: colors.text },
  dangerLabel: { color: colors.danger },
});
