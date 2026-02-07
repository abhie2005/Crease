/**
 * Signup screen: email + password + confirm, navigates to profile setup on success.
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
import { signUp } from '@/firebase/auth';
import { Input } from '@/components/Input';
import { COLORS } from '@/theme/colors';

/** Signup form (email, password, confirm). */
export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await signUp(email.trim(), password);
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[COLORS.DARK_TEAL, COLORS.DARK_TEAL_LIGHTER]}
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
            <Text style={styles.heroSubtitle}>Join the community</Text>
          </View>

          <View style={styles.formSection}>
            <View style={styles.form}>
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                containerStyle={styles.inputContainer}
                variant="underline"
                labelStyle={styles.inputLabel}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
              />

              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password"
                secureTextEntry
                containerStyle={styles.inputContainer}
                variant="underline"
                labelStyle={styles.inputLabel}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
              />

              <Input
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat your password"
                secureTextEntry
                containerStyle={styles.inputContainer}
                variant="underline"
                labelStyle={styles.inputLabel}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
              />

              <TouchableOpacity 
                style={[styles.signUpButton, loading && styles.disabledButton]}
                onPress={handleSignUp}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.signUpButtonText}>
                  {loading ? 'Creating Account...' : 'Sign Up'}
                </Text>
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <TouchableOpacity
                  onPress={() => router.push('/login')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.footerLink}>Sign In</Text>
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
    letterSpacing: 6,
    marginBottom: 8
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    letterSpacing: 1
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
  signUpButton: {
    backgroundColor: COLORS.MINT,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24
  },
  disabledButton: {
    opacity: 0.6
  },
  signUpButtonText: {
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
    color: COLORS.MINT,
    fontWeight: '700'
  }
});

