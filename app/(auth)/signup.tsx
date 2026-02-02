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
import { useRouter } from 'expo-router';
import { signUp } from '@/firebase/auth';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

/** Signup form (email, password, confirm). */
export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
      
      {/* Decorative Background Elements */}
      <View style={[styles.decoCircle, styles.circle1]} />
      <View style={[styles.decoCircle, styles.circle2]} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.heroSection}>
              <Text style={styles.appName}>CREASE</Text>
              <View style={styles.taglineBorder} />
              <Text style={styles.heroSubtitle}>Join the community</Text>
            </View>

            <View style={styles.formCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.formTitle}>Create Account</Text>
                <View style={styles.titleUnderline} />
              </View>
              
              <Text style={styles.formSubtitle}>Enter your details to get started</Text>

              <View style={styles.form}>
                <Input
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  containerStyle={styles.inputContainer}
                  inputStyle={styles.inputField}
                />

                <Input
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Create a password"
                  secureTextEntry
                  containerStyle={styles.inputContainer}
                  inputStyle={styles.inputField}
                />

                <Input
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repeat your password"
                  secureTextEntry
                  containerStyle={styles.inputContainer}
                  inputStyle={styles.inputField}
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
    flex: 1,
    backgroundColor: '#042f2e' // Very deep teal/green
  },
  decoCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(52, 211, 153, 0.05)'
  },
  circle1: {
    width: 300,
    height: 300,
    top: -100,
    left: -50
  },
  circle2: {
    width: 400,
    height: 400,
    bottom: -100,
    right: -100
  },
  keyboardView: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 80,
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center'
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40
  },
  appName: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 4,
    marginBottom: 8
  },
  taglineBorder: {
    width: 40,
    height: 4,
    backgroundColor: '#10b981',
    borderRadius: 2,
    marginBottom: 12
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  formCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 32,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 20
  },
  cardHeader: {
    marginBottom: 8
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4
  },
  titleUnderline: {
    width: 30,
    height: 4,
    backgroundColor: '#10b981',
    borderRadius: 2
  },
  formSubtitle: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 32,
    fontWeight: '500'
  },
  form: {
    width: '100%'
  },
  inputContainer: {
    marginBottom: 20
  },
  inputField: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56
  },
  signUpButton: {
    backgroundColor: '#10b981',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8
  },
  disabledButton: {
    opacity: 0.6
  },
  signUpButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32
  },
  footerText: {
    fontSize: 15,
    color: '#64748b'
  },
  footerLink: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '800',
    marginLeft: 4
  }
});

