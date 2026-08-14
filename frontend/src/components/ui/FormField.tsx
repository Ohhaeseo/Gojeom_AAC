import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, shadow, spacing, typography } from '@/theme/tokens';

type FormFieldProps = TextInputProps & { label?: string; required?: boolean; unit?: string; error?: string };

export function FormField({ label, required, unit, error, style, ...props }: FormFieldProps) {
  return (
    <View style={styles.root}>
      {label ? <Text style={styles.label}>{label}{required ? <Text style={styles.required}>*</Text> : null}</Text> : null}
      <View style={[styles.field, error && styles.errorField]}>
        <TextInput placeholderTextColor={colors.textMuted} style={[styles.input, style]} {...props} />
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 7 },
  label: { ...typography.label, color: colors.text },
  required: { color: colors.danger },
  field: { minHeight: 52, flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.primaryLight, backgroundColor: colors.backgroundAlt, ...shadow },
  errorField: { borderColor: colors.danger },
  input: { flex: 1, minHeight: 52, paddingHorizontal: spacing.md, ...typography.body, color: colors.text },
  unit: { paddingRight: spacing.md, ...typography.label, color: colors.textTertiary },
  error: { ...typography.caption, color: colors.danger },
});
