/**
 * Profile setup: name, student ID, username; creates/updates Firestore profile.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { createOrUpdateUser, checkUsernameAvailability } from '@/services/users';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { validateUsernameFormat } from '@/utils/usernameValidation';
import { COLORS } from '@/theme/colors';

/** Profile setup form (name, studentId, username). */
export default function ProfileSetupScreen() {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [username, setUsername] = useState('');
  const [usernameFormatError, setUsernameFormatError] = useState<string | null>(null);
  const [usernameAvailability, setUsernameAvailability] = useState<'checking' | 'available' | 'taken' | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const router = useRouter();

  // Navigate to home once profile is saved and available
  useEffect(() => {
    if (profileSaved && userProfile) {
      router.replace('/(tabs)');
    }
  }, [profileSaved, userProfile, router]);

  // Debounced username availability check
  useEffect(() => {
    if (!username.trim()) {
      setUsernameFormatError(null);
      setUsernameAvailability(null);
      return;
    }

    // Format validation
    const formatValidation = validateUsernameFormat(username);
    if (!formatValidation.valid) {
      setUsernameFormatError(formatValidation.error || 'Invalid username format');
      setUsernameAvailability(null);
      return;
    }

    setUsernameFormatError(null);
    setUsernameAvailability('checking');

    // Debounce availability check
    const timeoutId = setTimeout(async () => {
      try {
        const isAvailable = await checkUsernameAvailability(username);
        setUsernameAvailability(isAvailable ? 'available' : 'taken');
      } catch (error) {
        console.error('Error checking username availability:', error);
        setUsernameAvailability(null);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username]);

  const handleSave = async () => {
    if (!name.trim() || !studentId.trim() || !username.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Validate username format
    const formatValidation = validateUsernameFormat(username);
    if (!formatValidation.valid) {
      Alert.alert('Invalid Username', formatValidation.error || 'Please enter a valid username');
      return;
    }

    // Check username availability one more time before saving
    if (usernameAvailability !== 'available') {
      Alert.alert('Username Unavailable', 'This username is already taken. Please choose another one.');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setLoading(true);
    try {
      await createOrUpdateUser(user.uid, {
        name: name.trim(),
        email: user.email || '',
        studentId: studentId.trim(),
        username: username.trim()
      });
      // Small delay to ensure Firestore write propagates
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Refresh user profile in AuthProvider
      await refreshUserProfile();
      // Set flag to trigger navigation once userProfile state updates
      setProfileSaved(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[COLORS.DARK_TEAL, COLORS.DARK_TEAL_LIGHTER]}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>Please provide your information</Text>

          <View style={styles.form}>
            <Input
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              autoCapitalize="words"
              variant="underline"
              labelStyle={styles.inputLabel}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />

            <Input
              label="Student ID"
              value={studentId}
              onChangeText={setStudentId}
              placeholder="Enter your student ID"
              autoCapitalize="none"
              variant="underline"
              labelStyle={styles.inputLabel}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />

            <View style={styles.usernameContainer}>
              <Input
                label="Username"
                value={username}
                onChangeText={setUsername}
                placeholder="Choose a unique username"
                autoCapitalize="none"
                variant="underline"
                labelStyle={styles.inputLabel}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
              />
              {usernameFormatError && (
                <Text style={styles.errorText}>{usernameFormatError}</Text>
              )}
              {username && !usernameFormatError && (
                <View style={styles.availabilityContainer}>
                  {usernameAvailability === 'checking' && (
                    <Text style={styles.checkingText}>Checking availability...</Text>
                  )}
                  {usernameAvailability === 'available' && (
                    <Text style={styles.availableText}>✓ Username available</Text>
                  )}
                  {usernameAvailability === 'taken' && (
                    <Text style={styles.takenText}>✗ Username already taken</Text>
                  )}
                </View>
              )}
            </View>

            <Button
              title="Save Profile"
              onPress={handleSave}
              loading={loading}
              disabled={loading}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center'
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#fff'
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: 'rgba(255, 255, 255, 0.8)'
  },
  form: {
    width: '100%'
  },
  inputLabel: {
    color: 'rgba(255, 255, 255, 0.9)'
  },
  usernameContainer: {
    marginBottom: 8
  },
  availabilityContainer: {
    marginTop: 4,
    marginLeft: 4
  },
  errorText: {
    color: COLORS.LIVE,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4
  },
  checkingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12
  },
  availableText: {
    color: COLORS.COMPLETED,
    fontSize: 12
  },
  takenText: {
    color: COLORS.LIVE,
    fontSize: 12
  }
});

