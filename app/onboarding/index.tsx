import React from 'react';
import { View, Text, Button, Colors } from 'react-native-ui-lib';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BorderRadius } from '../../constants/design-system';

export default function OnboardingWelcome() {
  const router = useRouter();

  const handleStart = () => {
    router.push('/onboarding/chat');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.screenBG }}>
      <StatusBar style="dark" />

      <View flex center padding-page>
        <Text h1 center marginB-s4 textDefault style={{ letterSpacing: -1 }}>
          Kora.
        </Text>

        <Text h2 center marginB-s10 textMuted style={{ fontWeight: '400' }}>
          Pause. Breathe.{'\n'}Spend better.
        </Text>

        <Button
          label="Get Started"
          backgroundColor={Colors.primary}
          color={Colors.textInverse}
          borderRadius={BorderRadius.round}
          size={Button.sizes.large}
          onPress={handleStart}
          style={{ width: '100%', maxWidth: 300 }}
        />
      </View>
    </SafeAreaView>
  );
}
