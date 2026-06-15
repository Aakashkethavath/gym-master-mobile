import React from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator,
  StyleSheet, ViewStyle, TextStyle,
} from 'react-native';
import { palette, radius, typography, spacing } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  label, onPress, variant = 'primary', size = 'md',
  loading = false, disabled = false, style, textStyle, fullWidth = true,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? palette.bg : palette.accent}
        />
      ) : (
        <Text style={[styles.label, styles[`label_${variant}`], styles[`labelSize_${size}`], textStyle]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.45 },

  // variants
  primary: { backgroundColor: palette.accent },
  secondary: { backgroundColor: palette.surface2, borderWidth: 1, borderColor: palette.border },
  ghost: { backgroundColor: palette.transparent },
  danger: { backgroundColor: palette.danger },

  // sizes
  size_sm: { height: 36, paddingHorizontal: spacing[3] },
  size_md: { height: 48, paddingHorizontal: spacing[4] },
  size_lg: { height: 56, paddingHorizontal: spacing[5] },

  // labels
  label: { fontFamily: typography.bodySemibold, letterSpacing: 0.2 },
  label_primary: { color: palette.bg },
  label_secondary: { color: palette.ink },
  label_ghost: { color: palette.inkSecondary },
  label_danger: { color: palette.white },

  labelSize_sm: { fontSize: typography.size.sm },
  labelSize_md: { fontSize: typography.size.base },
  labelSize_lg: { fontSize: typography.size.md },
});
