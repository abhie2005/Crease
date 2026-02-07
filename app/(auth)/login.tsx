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
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { logInWithEmailOrUsername } from '@/firebase/auth';
import { Input } from '@/components/Input';

const MINT = '#10b981';
const DARK_TEAL = '#042f2e';
const DARK_TEAL_LIGHTER = '#064e3b';

/** Login form (email or username + password). */
export default function LoginScreen() {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[DARK_TEAL, DARK_TEAL_LIGHTER]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroSection}>
            <Text style={styles.appName}>CREASE</Text>
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
                inputStyle={styles.inputField}
                labelStyle={styles.inputLabel}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
              />

              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                containerStyle={styles.inputContainer}
                inputStyle={styles.inputField}
                labelStyle={styles.inputLabel}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
              />

              <TouchableOpacity
                style={[styles.signInButton, loading && styles.disabledButton]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.signInButtonText}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Text>
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={styles.footerText}>New to Crease? </Text>
                <TouchableOpacity
                  onPress={() => router.push('/signup')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.footerLink}>Create Account</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    color: '#fff',
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
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8
  },
  inputField: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16
  },
  signInButton: {
    backgroundColor: MINT,
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
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)'
  },
  footerLink: {
    fontSize: 15,
    color: MINT,
    fontWeight: '700'
  }
});
