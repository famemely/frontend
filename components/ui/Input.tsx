import { useTheme } from '@/contexts/ThemeContext';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
}

/**
 * Reusable Input component following the global theme
 */
export function Input({
  label,
  error,
  helperText,
  style,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const styles = createStyles(theme);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      {error && <Text style={styles.error}>{error}</Text>}

      <TextInput
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          error && styles.inputError,
          style,
        ]}
        placeholderTextColor={theme.colors.placeholder}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />

      {helperText && !error && <Text style={styles.helperText}>{helperText}</Text>}
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.md,
    },
    label: {
      fontSize: 14,
      fontWeight: '400',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
      opacity: 0.9,
    },
    input: {
      backgroundColor: '#FFFFFF',
      borderColor: theme.colors.accent,
      borderWidth: 1,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      fontSize: 16,
      color: theme.colors.text,
      fontWeight: '400',
      opacity: 0.7,
    },
    inputFocused: {
      opacity: 1,
      borderWidth: 1.5,
    },
    inputError: {
      borderColor: theme.colors.error,
      backgroundColor: '#FEE2E2',
      opacity: 1,
      borderWidth: 1.5,
    },
    error: {
      color: theme.colors.error,
      fontSize: 12,
      marginBottom: theme.spacing.xs,
      paddingHorizontal: theme.spacing.xs,
      opacity: 0.9,
      fontWeight: '500',
      textAlign: 'right',
    },
    helperText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
      opacity: 0.7,
    },
  });
