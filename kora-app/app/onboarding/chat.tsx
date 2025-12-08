import React, { useState, useEffect, useRef } from 'react';
import { View, Text, LoaderScreen, Colors, TouchableOpacity } from 'react-native-ui-lib';
import { useAudioRecorder, AudioModule, RecordingPresets, createAudioPlayer, type AudioPlayer } from 'expo-audio';
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

  useEffect(() => {
    handleKoraSpeak(
      "Hi, I'm Kora. Pause. Breathe. I'm here to help you spend better. First, tell me: how much money comes in each month?"
    );
    setStep('INCOME');

    return () => {
      if (audioRecorder.isRecording) {
        audioRecorder.stop();
      }
      if (audioPlayer.current) {
        audioPlayer.current.release();
      }
    };
  }, []);

  const handleStartRecording = async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        console.error('Recording permission not granted');
        return;
      }

      await audioRecorder.record();
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    setIsProcessing(true);

    if (!audioRecorder.isRecording) {
      setIsProcessing(false);
      return;
    }

    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (uri) {
        await processUserAudio(uri);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
    setIsProcessing(false);
  };

  const processUserAudio = async (uri: string) => {
    try {
      const text = await AIService.transcribe(uri);
      const response = await AIService.generateResponse(text, {
        isOnboarding: true,
        step,
        currency: currency || 'NGN',
        collectedData,
      });

      if (response.data) {
        handleDataExtraction(response.data);
      }

      setKoraText(response.text);
      await handleKoraSpeak(response.text);
    } catch (error) {
      console.error(error);
      setKoraText("I didn't quite catch that. Could you say it again?");
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
    try {
      if (audioPlayer.current) {
        audioPlayer.current.release();
      }

      const audioUri = await AIService.speak(text);
      if (audioUri) {
        audioPlayer.current = createAudioPlayer(audioUri);
        await audioPlayer.current.play();
      }
    } catch (error) {
      console.error('Failed to play audio', error);
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
