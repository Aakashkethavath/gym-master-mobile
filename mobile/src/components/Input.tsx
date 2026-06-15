import React, { useState } from 'react';
import {
  View, TextInput, Text, TouchableOpacity,
  StyleSheet, TextInputProps, ViewStyle,
} from 'react-native';
import { palette, radius, typography, spacing } from '@/theme/tokens';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  rightIcon?: React.ReactNode;
  secureToggle?: boolean;
}

export function Input({
  label, error, containerStyle, rightIcon, secureToggle,
  secureTextEntry, style, ...rest
}: InputProps) {
  const [hidden, setHidden] = useState(secureTextEntry ?? false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputRow, !!error && styles.inputRowError]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={palette.inkMuted}
          selectionColor={palette.accent}
          secureTextEntry={hidden}
          {...rest}
        />
        {secureToggle && (
          <TouchableOpacity onPress={() => setHidden((h) => !h)} style={styles.icon}>
            <Text style={styles.iconText}>{hidden ? '👁' : '🙈'}</Text>
          </TouchableOpacity>
        )}
        {!secureToggle && rightIcon && <View style={styles.icon}>{rightIcon}</View>}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing[4] },
  label: {
    fontFamily: typography.bodyMedium,
    fontSize: typography.size.sm,
    color: palette.inkSecondary,
    marginBottom: spacing[1] + 2,
    letterSpacing: 0.1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
  },
  inputRowError: { borderColor: palette.danger },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: spacing[3],
    fontFamily: typography.body,
    fontSize: typography.size.base,
    color: palette.ink,
  },
  icon: { paddingRight: spacing[3] },
  iconText: { fontSize: 16 },
  error: {
    fontFamily: typography.body,
    fontSize: typography.size.sm,
    color: palette.danger,
    marginTop: spacing[1],
  },
});
