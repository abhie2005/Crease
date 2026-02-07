/**
 * Reusable text input with optional label and style overrides.
 * Used in auth, profile, search, and admin forms.
 */

import React from 'react';
import { TextInput, StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';

/** See InputProps. */
interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  numberOfLines?: number;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  placeholderTextColor?: string;
  variant?: 'default' | 'underline';
}

/** Labeled text input with optional secure entry and multiline. */
export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  multiline = false,
  numberOfLines = 1,
  containerStyle,
  inputStyle,
  labelStyle,
  placeholderTextColor = '#999',
  variant = 'default'
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, labelStyle]}>{label}</Text>}
      <TextInput
        style={[
          variant === 'default' ? styles.input : styles.inputUnderline,
          multiline && styles.multilineInput,
          inputStyle
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        numberOfLines={numberOfLines}
        placeholderTextColor={placeholderTextColor}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff'
  },
  inputUnderline: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff'
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top'
  }
});

