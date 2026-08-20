import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { colors, radius, typography } from '@/theme/tokens';

type Props = {
  label: string;
  detail?: string;
  checked: boolean;
  onToggle: () => void;
  /** 라벨 앞에 `[필수]` / `[선택]`을 붙인다. 법적으로 구분해서 보여야 한다. */
  required?: boolean;
  emphasis?: boolean;
};

/**
 * 동의 체크 한 줄.
 *
 * <b>누를 수 있는 영역이 행 전체다.</b> 체크박스만 누르게 하면 표적이 22px밖에
 * 안 돼 손가락으로 맞추기 어렵다. 대신 안에 다른 누를 것을 넣지 않는다 —
 * 중첩 `Pressable`은 부모까지 함께 발동한다. (오답 노트 N-11)
 */
export function CheckRow({ label, detail, checked, onToggle, required, emphasis }: Props) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={`${required === undefined ? '' : required ? '필수 ' : '선택 '}${label}`}
      onPress={onToggle}
      style={styles.row}
    >
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked ? <Icon name="check" size={13} color={colors.white} /> : null}
      </View>
      <View style={styles.copy}>
        <Text style={[styles.label, emphasis && styles.labelStrong]}>
          {required === undefined ? '' : <Text style={required ? styles.required : styles.optional}>{required ? '[필수] ' : '[선택] '}</Text>}
          {label}
        </Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 },
  box: { width: 22, height: 22, marginTop: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm - 2, borderWidth: 1, borderColor: colors.disabled, backgroundColor: colors.surface },
  boxOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  check: { color: colors.white, fontSize: 13, fontWeight: '700' },
  copy: { flex: 1, gap: 2 },
  label: { ...typography.body, color: colors.text },
  labelStrong: { ...typography.label, color: colors.text },
  required: { color: colors.danger },
  optional: { color: colors.textMuted },
  detail: { ...typography.caption, color: colors.textMuted, lineHeight: 17 },
});
