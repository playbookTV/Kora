import { Stack, useRouter, useSegments } from 'expo-router';
import '../constants/design-system'; // Initialize Design System
import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useUserStore } from '../store/user-store';
import { useAuthStore } from '../store/auth-store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    // Load any custom fonts here if needed
  });

  const [isReady, setIsReady] = useState(false);

  const { hasOnboarded } = useUserStore();
  const { status, checkAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Check auth status on app start
  useEffect(() => {
    const init = async () => {
      await checkAuth();
      setIsReady(true);
    };
    init();
  }, []);

  // Hide splash screen when fonts are loaded
  useEffect(() => {
    if (loaded && isReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isReady]);

  // Handle navigation based on auth and onboarding status
  useEffect(() => {
    if (!loaded || !isReady) return;

    const inAuthGroup = segments[0] === 'auth';
    const inOnboardingGroup = segments[0] === 'onboarding';
    const isAuthenticated = status === 'authenticated';

    if (!isAuthenticated && !inAuthGroup) {
      // Not authenticated - redirect to auth
      router.replace('/auth');
    } else if (isAuthenticated && inAuthGroup) {
      // Authenticated but in auth flow - redirect based on onboarding
      if (hasOnboarded) {
        router.replace('/');
      } else {
        router.replace('/onboarding');
      }
    } else if (isAuthenticated && !hasOnboarded && !inOnboardingGroup && !inAuthGroup) {
      // Authenticated but not onboarded - redirect to onboarding
      router.replace('/onboarding');
    } else if (isAuthenticated && hasOnboarded && inOnboardingGroup) {
      // Already onboarded - redirect to home
      router.replace('/');
    }
  }, [status, hasOnboarded, segments, loaded, isReady]);

  if (!loaded || !isReady) {
    return null;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="voice-session" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="add-transaction" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
    </Stack>
  );
}
