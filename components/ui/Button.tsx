import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  children: string;
}

/**
 * Reusable Button component following the global theme
 */
export function Button({
  variant = 'primary',
  loading = false,
  fullWidth = false,
  disabled,
  children,
  style,
  ...props
}: ButtonProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primary;
      case 'secondary':
        return styles.secondary;
      case 'danger':
        return styles.danger;
      case 'ghost':
        return styles.ghost;
      default:
        return styles.primary;
    }
  };

  const getTextVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryText;
      case 'secondary':
        return styles.secondaryText;
      case 'danger':
        return styles.dangerText;
      case 'ghost':
        return styles.ghostText;
      default:
        return styles.primaryText;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getVariantStyle(),
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#FFFFFF' : theme.colors.accent}
        />
      ) : (
        <Text style={[styles.text, getTextVariantStyle()]}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    button: {
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md + 2,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },
    primary: {
      backgroundColor: theme.colors.accent,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.accent,
    },
    danger: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.error,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    fullWidth: {
      width: '100%',
    },
    disabled: {
      opacity: 0.6,
    },
    text: {
      fontSize: 16,
      fontWeight: '400',
      letterSpacing: 0.3,
    },
    primaryText: {
      color: '#FFFFFF',
    },
    secondaryText: {
      color: theme.colors.accent,
    },
    dangerText: {
      color: theme.colors.error,
    },
    ghostText: {
      color: theme.colors.text,
    },
  });
