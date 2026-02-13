/**
 * Full-screen background that adapts to theme: LinearGradient for dark, solid View for light.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/providers/ThemeProvider';

interface ThemedBackgroundProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ThemedBackground({ children, style }: ThemedBackgroundProps) {
  const { theme, colors } = useTheme();

  if (theme === 'dark') {
    return (
      <LinearGradient
        colors={[colors.background, colors.backgroundLighter]}
        style={[styles.base, style]}
      >
        {children}
      </LinearGradient>
    );
  }

  return <View style={[styles.base, { backgroundColor: colors.background }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
  },
});
