/**
 * Profile index: redirects to profile setup.
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

/** Redirects to /profile/setup. */
export default function ProfileIndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/profile/setup');
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}

