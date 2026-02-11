/**
 * Full-screen background that adapts to theme: LinearGradient for dark, solid View for light.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/providers/ThemeProvider';

interface ThemedBackgroundProps {
  children?: React.ReactNode;
}

export function ThemedBackground({ children }: ThemedBackgroundProps) {
  const { theme, colors } = useTheme();

  if (theme === 'dark') {
    return (
      <LinearGradient
        colors={[colors.background, colors.backgroundLighter]}
        style={StyleSheet.absoluteFill}
      >
        {children}
      </LinearGradient>
    );
  }

  return <View style={[styles.light, { backgroundColor: colors.background }]}>{children}</View>;
}

const styles = StyleSheet.create({
  light: {
    ...StyleSheet.absoluteFillObject
  }
});
