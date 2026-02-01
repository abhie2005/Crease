/**
 * Root layout: AuthProvider and route guards (auth, profile, tabs).
 * Wraps app with auth context and Stack navigation.
 */

import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

function RootLayoutNav() {
  const { user, userProfile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)' || segments[0] === 'auth';
    const inProfileGroup = segments[0] === 'profile';

    if (!user) {
      // User is not signed in
      if (!inAuthGroup) {
        router.replace('/login');
      }
    } else if (user && !userProfile) {
      // User is signed in but no profile
      if (!inProfileGroup) {
        router.replace('/profile/setup');
      }
    } else if (user && userProfile) {
      // User is signed in and has profile
      const onIndex = segments.length === 0 || (segments.length === 1 && segments[0] === 'index');
      // Redirect auth (login/signup) and index to tabs; allow profile group (setup, settings) for editing
      if (inAuthGroup || onIndex) {
        router.replace('/(tabs)');
      }
    }
  }, [user, userProfile, loading, segments]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="index" />
    </Stack>
  );
}

/** Root layout: wraps app with AuthProvider and Stack with route guards. */
export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  }
});
