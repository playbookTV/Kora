import React, { useState, useEffect, useRef } from 'react';
import { View, Text, LoaderScreen, Colors, TouchableOpacity } from 'react-native-ui-lib';
import { useAudioRecorder, AudioModule, RecordingPresets, createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useUserStore } from '../../store/user-store';
import { useTransactionStore } from '../../store/transaction-store';
import { AIService } from '../../services/ai-service';
import { BorderRadius, Shadows } from '../../constants/design-system';

type OnboardingStep = 'INTRO' | 'INCOME' | 'EXPENSES' | 'BALANCE_PAYDAY' | 'COMPLETE';

interface CollectedData {
  income?: { amount: number; frequency: string; payday?: number };
  expenses?: { name: string; amount: number; due_day?: number }[];
  balance?: number;
  savingsGoal?: number;
}


export default function OnboardingChat() {
  const router = useRouter();
  const { setIncome, addFixedExpense, setPayday, completeOnboarding, currency } = useUserStore();
  const { setBalance, recalculateSafeSpend } = useTransactionStore();

  const [step, setStep] = useState<OnboardingStep>('INTRO');
  const [collectedData, setCollectedData] = useState<CollectedData>({});
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [koraText, setKoraText] = useState(
    "Hi, I'm Kora. Pause. Breathe. I'm here to help you spend better. Let's get set up."
  );

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const audioPlayer = useRef<AudioPlayer | null>(null);
  const isRecordingRef = useRef(false); // Track recording state synchronously
  const isProcessingRef = useRef(false); // Prevent duplicate processing

  useEffect(() => {
    // Set audio mode to allow recording
    (async () => {
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    })();

    handleKoraSpeak(
      "Hi, I'm Kora. Pause. Breathe. I'm here to help you spend better. First, tell me: how much money comes in each month?"
    );
    setStep('INCOME');

    return () => {
      if (audioPlayer.current) {
        audioPlayer.current.release();
      }
    };
  }, []);

  const handleStartRecording = async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      console.log('[Onboarding] Recording permission status:', status);
      if (!status.granted) {
        console.error('[Onboarding] Recording permission not granted');
        setKoraText('I need microphone permission to listen.');
        return;
      }

      console.log('[Onboarding] Preparing recorder...');
      await audioRecorder.prepareToRecordAsync();
      console.log('[Onboarding] Starting recording...');
      audioRecorder.record();
      isRecordingRef.current = true;
      setIsRecording(true);
      console.log('[Onboarding] Recording started, isRecording:', audioRecorder.isRecording);
    } catch (err) {
      console.error('[Onboarding] Failed to start recording', err);
    }
  };

  const handleStopRecording = async () => {
    console.log('[Onboarding] handleStopRecording called, isRecordingRef:', isRecordingRef.current);
    if (!isRecordingRef.current) {
      console.log('[Onboarding] Not recording (ref), returning early');
      return;
    }

    isRecordingRef.current = false;
    setIsRecording(false);
    setIsProcessing(true);

    try {
      console.log('[Onboarding] Stopping recording...');
      audioRecorder.stop();

      // Poll for the URI to become available (up to 2 seconds)
      let uri = audioRecorder.uri;
      let attempts = 0;
      while (!uri && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        uri = audioRecorder.uri;
        attempts++;
        console.log('[Onboarding] Waiting for URI, attempt:', attempts, 'uri:', uri);
      }

      console.log('[Onboarding] Recording stopped, final uri:', uri);

      if (uri) {
        await processUserAudio(uri);
      } else {
        console.error('[Onboarding] No audio URI after stopping');
        setKoraText('Recording failed. Please try again.');
      }
    } catch (err) {
      console.error('[Onboarding] Failed to stop recording', err);
    }
    setIsProcessing(false);
  };

  const processUserAudio = async (uri: string) => {
    // Prevent duplicate processing
    if (isProcessingRef.current) {
      console.log('[Onboarding] Already processing, skipping duplicate request');
      return;
    }
    isProcessingRef.current = true;

    try {
      const text = await AIService.transcribe(uri);
      console.log('[Onboarding] Transcription result:', text);

      const response = await AIService.generateResponse(text, {
        isOnboarding: true,
        step,
        currency: currency || 'NGN',
        collectedData,
      });
      console.log('[Onboarding] AI response received:', response.text?.substring(0, 50));

      if (response.data) {
        handleDataExtraction(response.data);
      }

      setKoraText(response.text);
      await handleKoraSpeak(response.text);
    } catch (error) {
      console.error('[Onboarding] processUserAudio error:', error);
      setKoraText("I didn't quite catch that. Could you say it again?");
    } finally {
      isProcessingRef.current = false;
    }
  };

  const handleDataExtraction = (data: any) => {
    switch (step) {
      case 'INCOME':
        // LLM returns: extracted.income.amount, extracted.income.frequency, extracted.income.payday
        if (data.income?.amount) {
          setIncome(data.income.amount);
          // Also extract payday if provided in this step
          if (data.income.payday) {
            setPayday(data.income.payday);
          }
          // Update collected data for context persistence
          setCollectedData(prev => ({
            ...prev,
            income: {
              amount: data.income.amount,
              frequency: data.income.frequency || 'monthly',
              payday: data.income.payday,
            },
          }));
          setStep('EXPENSES');
        }
        break;
      case 'EXPENSES':
        // LLM returns: extracted.expenses (array)
        if (data.expenses && Array.isArray(data.expenses)) {
          data.expenses.forEach((ex: any) => addFixedExpense(ex.name, ex.amount, ex.due_day));
          // Update collected data - accumulate expenses
          setCollectedData(prev => ({
            ...prev,
            expenses: [...(prev.expenses || []), ...data.expenses],
          }));
          setStep('BALANCE_PAYDAY');
        }
        break;
      case 'BALANCE_PAYDAY':
        // LLM returns: extracted.balance, extracted.savingsGoal
        if (data.balance) {
          setBalance(data.balance);
          setCollectedData(prev => ({ ...prev, balance: data.balance }));
        }
        if (data.savingsGoal) {
          setCollectedData(prev => ({ ...prev, savingsGoal: data.savingsGoal }));
        }

        // Complete when we have balance (payday was collected in INCOME step)
        if (data.balance && collectedData.income?.payday) {
          setStep('COMPLETE');
          recalculateSafeSpend();
          completeOnboarding();
          setTimeout(() => router.replace('/'), 3000);
        }
        break;
    }
  };

  const handleKoraSpeak = async (text: string) => {
    console.log('[Onboarding] handleKoraSpeak called with text length:', text.length);
    try {
      if (audioPlayer.current) {
        audioPlayer.current.release();
      }

      console.log('[Onboarding] Requesting TTS from backend...');
      const audioUri = await AIService.speak(text);
      console.log('[Onboarding] TTS returned audioUri:', audioUri);

      if (audioUri) {
        console.log('[Onboarding] Creating audio player...');
        audioPlayer.current = createAudioPlayer(audioUri);
        console.log('[Onboarding] Playing audio...');
        audioPlayer.current.play(); // play() doesn't need await
        console.log('[Onboarding] Audio playback started');
      } else {
        console.warn('[Onboarding] No audio URI returned from TTS');
      }
    } catch (error) {
      console.error('[Onboarding] Failed to play audio:', error);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.screenBG }}>
      {/* Visualizer Area */}
      <View flex center padding-page>
        {/* Kora's Bubble */}
        <View
          bg-cardBG
          padding-card
          br40
          style={[Shadows.medium, { maxWidth: '90%' }]}
        >
          <Text h3 center textDefault>
            {koraText}
          </Text>
        </View>

        {/* Dynamic Visualizer */}
        <View
          marginT-s10
          center
          bg-primary
          style={{
            width: 100,
            height: 100,
            borderRadius: BorderRadius.round,
            opacity: isRecording ? 1 : 0.2,
          }}
        />
      </View>

      {/* Controls */}
      <View padding-page bottom centerH>
        {isProcessing ? (
          <LoaderScreen
            color={Colors.primary}
            message="Processing..."
            messageStyle={{ color: Colors.textMuted }}
            overlay={false}
          />
        ) : (
          <TouchableOpacity
            onPressIn={handleStartRecording}
            onPressOut={handleStopRecording}
            style={{
              width: 80,
              height: 80,
              borderRadius: BorderRadius.round,
              backgroundColor: Colors.primary,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Feather name={isRecording ? 'mic-off' : 'mic'} size={32} color={Colors.textInverse} />
          </TouchableOpacity>
        )}
        <Text marginT-s3 textMuted caption>
          {isRecording ? 'Listening...' : 'Hold to Speak'}
        </Text>
      </View>
    </SafeAreaView>
  );
}
