/**
 * Auth group layout: Stack for login and signup (no header).
 */

import { Stack } from 'expo-router';

/** Stack layout for (auth) group (login, signup). */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}

