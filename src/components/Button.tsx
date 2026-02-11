/**
 * Reusable primary/secondary button with optional loading state.
 * Used across auth, profile, and admin screens.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

/** See ButtonProps. */
interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
}

/** Primary, secondary, or ghost button; supports disabled and loading. */
export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary'
}) => {
  const { colors } = useTheme();

  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: colors.accent };
      case 'secondary':
        return { backgroundColor: 'transparent' as const, borderWidth: 1, borderColor: colors.accent };
      case 'ghost':
        return { backgroundColor: 'transparent' as const };
      default:
        return { backgroundColor: colors.accent };
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
        return { color: '#fff' as const };
      case 'secondary':
        return { color: colors.accent };
      case 'ghost':
        return { color: colors.textPrimary };
      default:
        return { color: '#fff' as const };
    }
  };

  const getLoaderColor = () => {
    switch (variant) {
      case 'primary':
        return '#fff';
      case 'secondary':
        return colors.accent;
      case 'ghost':
        return colors.textPrimary;
      default:
        return '#fff';
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getButtonStyle(),
        (disabled || loading) && styles.disabledButton
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={getLoaderColor()} />
      ) : (
        <Text style={[styles.buttonText, getTextStyle()]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48
  },
  disabledButton: {
    opacity: 0.5
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600'
  }
});

