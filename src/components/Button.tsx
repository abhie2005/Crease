/**
 * Reusable primary/secondary button with optional loading state.
 * Used across auth, profile, and admin screens.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '@/theme/colors';

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
  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryButton;
      case 'secondary':
        return styles.secondaryButton;
      case 'ghost':
        return styles.ghostButton;
      default:
        return styles.primaryButton;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryText;
      case 'secondary':
        return styles.secondaryText;
      case 'ghost':
        return styles.ghostText;
      default:
        return styles.primaryText;
    }
  };

  const getLoaderColor = () => {
    switch (variant) {
      case 'primary':
        return '#fff';
      case 'secondary':
        return COLORS.MINT;
      case 'ghost':
        return '#fff';
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
  primaryButton: {
    backgroundColor: COLORS.MINT
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.MINT
  },
  ghostButton: {
    backgroundColor: 'transparent'
  },
  disabledButton: {
    opacity: 0.5
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600'
  },
  primaryText: {
    color: '#fff'
  },
  secondaryText: {
    color: COLORS.MINT
  },
  ghostText: {
    color: '#fff'
  }
});

