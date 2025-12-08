/**
 * Auth Layout
 *
 * Layout for authentication screens (phone input, OTP verification).
 * Uses a simple stack navigation without headers.
 */

import { Stack } from 'expo-router';
import { Colors } from 'react-native-ui-lib';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.screenBG },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="verify" />
    </Stack>
  );
}
