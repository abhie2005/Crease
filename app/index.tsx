import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';

export default function IndexRedirect() {
  const router = useRouter();
  const segments = useSegments();
  const { user, userProfile, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Mark as mounted after a brief delay to ensure router is ready
    const timer = setTimeout(() => {
      setMounted(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mounted || loading) return;

    // Only redirect if we're actually on the index route
    if (segments.length === 0 || segments[0] === 'index') {
      if (user && userProfile) {
        router.replace('/(tabs)');
      } else if (user && !userProfile) {
        router.replace('/profile/setup');
      } else {
        router.replace('/login');
      }
    }
  }, [mounted, user, userProfile, loading, segments, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  }
});
