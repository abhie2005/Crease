/**
 * Login screen: email/username + password, navigates to tabs on success.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaHeader } from '@/hooks/useSafeAreaHeader';
import { logInWithEmailOrUsername } from '@/firebase/auth';
import { Input } from '@/components/Input';
import { ThemedBackground } from '@/components/ThemedBackground';
import { useTheme } from '@/providers/ThemeProvider';

/** Login form (email or username + password). */
export default function LoginScreen() {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { top, bottom } = useSafeAreaHeader(24);
  const { theme, colors } = useTheme();

  const handleLogin = async () => {
    if (!emailOrUsername.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await logInWithEmailOrUsername(emailOrUsername.trim(), password);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      <ThemedBackground>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: top, paddingBottom: bottom + 24 }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroSection}>
            <Text style={[styles.appName, { color: colors.textPrimary }]}>CREASE</Text>
          </View>

          <View style={styles.formSection}>
            <View style={styles.form}>
              <Input
                label="Email or Username"
                value={emailOrUsername}
                onChangeText={setEmailOrUsername}
                placeholder="Enter your email or username"
                autoCapitalize="none"
                containerStyle={styles.inputContainer}
                variant="underline"
                labelStyle={{ ...styles.inputLabel, color: colors.textSecondary }}
                placeholderTextColor={colors.textTertiary}
              />

              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                containerStyle={styles.inputContainer}
                variant="underline"
                labelStyle={{ ...styles.inputLabel, color: colors.textSecondary }}
                placeholderTextColor={colors.textTertiary}
              />

              <TouchableOpacity
                style={[styles.signInButton, { backgroundColor: colors.accent }, loading && styles.disabledButton]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.signInButtonText}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Text>
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>New to Crease? </Text>
                <TouchableOpacity
                  onPress={() => router.push('/signup')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.footerLink, { color: colors.accent }]}>Create Account</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </ThemedBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  keyboardView: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    alignItems: 'center'
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 48
  },
  appName: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 6
  },
  formSection: {
    width: '100%',
    maxWidth: 400
  },
  form: {
    width: '100%'
  },
  inputContainer: {
    marginBottom: 24
  },
  inputLabel: {
    marginBottom: 8
  },
  signInButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24
  },
  disabledButton: {
    opacity: 0.6
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700'
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32
  },
  footerText: {
    fontSize: 15
  },
  footerLink: {
    fontSize: 15,
    fontWeight: '700'
  }
});
