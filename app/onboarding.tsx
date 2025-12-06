import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import VoiceInterface, { VoiceState } from '../components/VoiceInterface';

type Step = {
  id: string;
  koraText: string;
  nextDelay?: number; // How long to wait before next step if auto-progressing (not used for inputs)
};

const ONBOARDING_STEPS: Step[] = [
  {
    id: 'intro',
    koraText: "Hey, I'm Kora. I'm here to help you pause before spending. I need to understand your situation first. Takes about 2 minutes. Ready?",
  },
  {
    id: 'income',
    koraText: "How much money comes in each month? Just the rough total.",
  },
  {
    id: 'payday',
    koraText: "Got it. And when does that hit your account?",
  },
  {
    id: 'expenses',
    koraText: "What has to get paid every month no matter what? Rent, bills, subscriptions—hit me with the big ones.",
  },
  {
    id: 'confirm_expenses',
    koraText: "So about ₦223,000 locked. That leaves ₦227,000 flexible. Sound right?",
  },
  {
    id: 'current_balance',
    koraText: "What's in your account right now?",
  },
  {
    id: 'analysis',
    koraText: "Okay. ₦80k for 12 days is about ₦6,600 a day. Not a crisis, but tight. Last thing: Are you trying to save, or just survive?",
  },
  {
    id: 'closing',
    koraText: "Understood. We'll start simple. Before you spend, just talk to me. I'll make sure you don't lie to yourself. Let's go.",
  }
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [transcript, setTranscript] = useState('');

  // Auto-start conversation
  useEffect(() => {
    speakStep(0);
  }, []);

  const speakStep = (index: number) => {
    if (index >= ONBOARDING_STEPS.length) {
      // Finished
      router.replace('/');
      return;
    }

    const step = ONBOARDING_STEPS[index];
    setTranscript(step.koraText);
    setVoiceState('SPEAKING');

    // Simulate speaking duration based on text length
    const duration = Math.min(Math.max(step.koraText.length * 60, 2000), 5000); // 60ms per char cap

    setTimeout(() => {
      setVoiceState('IDLE');
    }, duration);
  };

  const handleMicPress = () => {
    if (voiceState === 'IDLE') {
      // Start listening
      setVoiceState('LISTENING');
    } else if (voiceState === 'LISTENING') {
      // Stop listening -> Thinking
      setVoiceState('THINKING');
      
      // Simulate processing time
      setTimeout(() => {
        // Move to next step
        const nextIndex = currentStepIndex + 1;
        setCurrentStepIndex(nextIndex);
        speakStep(nextIndex);
      }, 2000);
    }
  };

  return (
    <View style={styles.container}>
      <VoiceInterface 
        state={voiceState}
        onMicPress={handleMicPress}
        transcript={transcript}
        showKeyboard={false} // No quiet mode during onboarding ideally
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 40,
  },
});
