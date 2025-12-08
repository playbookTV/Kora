import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Button, LoaderScreen, Colors } from 'react-native-ui-lib';
import { Audio } from 'expo-av';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTransactionStore } from '../store/transaction-store';
import { useUserStore } from '../store/user-store';
import { AIService } from '../services/ai-service';
import { BorderRadius, Shadows } from '../constants/design-system';

// Intent types from conversation prompts
type Intent = 'SPEND_DECISION' | 'SAFE_SPEND_CHECK' | 'EMOTIONAL' | 'POST_SPEND' | 'GENERAL';

const MicOnIcon = () => <Feather name="mic" size={32} color={Colors.textInverse} />;
const MicOffIcon = () => <Feather name="mic-off" size={32} color={Colors.textInverse} />;

export default function VoiceSession() {
  const router = useRouter();
  const { updateSafeSpend, recalculateSafeSpend, currentBalance, daysToPayday, safeSpendToday, transactions, addTransaction } = useTransactionStore();
  const { income, payday, fixedExpenses, currency, savingsGoal, name } = useUserStore();

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [koraText, setKoraText] = useState("I'm listening. What's on your mind?");

  const recording = useRef<Audio.Recording | null>(null);
  const sound = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    handleStartRecording();
    return () => {
      if (recording.current) recording.current.stopAndUnloadAsync();
    };
  }, []);

  const handleStartRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recording.current = newRecording;
      setIsRecording(true);
      setKoraText('Listening...');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const handleStopRecording = async () => {
    if (!recording.current) return;
    setIsRecording(false);
    setIsProcessing(true);
    const uri = recording.current.getURI();
    await recording.current.stopAndUnloadAsync();
    if (uri) processUserAudio(uri);
    else setIsProcessing(false);
  };

  const processUserAudio = async (uri: string) => {
    try {
      const text = await AIService.transcribe(uri);

      // Calculate today's spending from transactions
      const today = new Date().toISOString().split('T')[0];
      const spentToday = transactions
        .filter(t => t.date.startsWith(today))
        .reduce((sum, t) => sum + t.amount, 0);

      // Calculate total fixed expenses
      const totalFixedExpenses = fixedExpenses.reduce((sum, exp) => sum + exp.amount, 0);

      // Calculate flexible remaining (income - fixed expenses - spent this month)
      const monthStart = new Date();
      monthStart.setDate(1);
      const spentThisMonth = transactions
        .filter(t => new Date(t.date) >= monthStart)
        .reduce((sum, t) => sum + t.amount, 0);
      const flexibleRemaining = (income || 0) - totalFixedExpenses - spentThisMonth;

      const context = {
        currency: currency || 'NGN',
        userProfile: {
          name: name || undefined,
          income: income || 0,
          payday: payday || 1,
          fixedExpenses: totalFixedExpenses,
          currentBalance: currentBalance || 0,
          savingsGoal: savingsGoal || undefined,
        },
        financialState: {
          safeSpendToday: safeSpendToday || 0,
          daysToPayday: daysToPayday || 1,
          spentToday,
          upcomingBills: 0, // TODO: Calculate from fixed expenses with due dates
          flexibleRemaining,
        },
      };

      const response = await AIService.generateResponse(text, context);

      // Handle different intents based on response action
      const intent = response.action as Intent;

      if (intent === 'POST_SPEND' && response.data?.logged) {
        // Voice spend logging - create transaction from logged data
        const logged = response.data.logged as { amount: number; category: string };
        if (logged.amount && logged.amount > 0) {
          addTransaction(
            logged.amount,
            `Voice logged: ${logged.category || 'expense'}`,
            logged.category || 'Voice Logged'
          );
          // Recalculate safe spend after adding transaction
          recalculateSafeSpend();
        }
      } else if (response.data) {
        if (response.data.safeSpend) {
          updateSafeSpend(response.data.safeSpend, response.data.days || daysToPayday);
        } else if (response.data.action === 'SAFE_SPEND_UPDATE') {
          recalculateSafeSpend();
        }
      }

      setKoraText(response.text);
      await handleKoraSpeak(response.text);
      setIsProcessing(false);
    } catch (error) {
      console.error(error);
      setKoraText("I struggled to hear that.");
      setIsProcessing(false);
    }
  };

  const handleKoraSpeak = async (text: string) => {
    if (sound.current) await sound.current.unloadAsync();
    const audioUri = await AIService.speak(text);
    if (audioUri) {
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: audioUri });
      sound.current = newSound;
      await newSound.playAsync();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.screenBG }}>
      <View flex center padding-page>
        {/* Kora's Response Bubble */}
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

        {/* Voice Visualizer */}
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
          <Button
            round
            backgroundColor={Colors.primary}
            iconSource={isRecording ? MicOffIcon : MicOnIcon}
            size={Button.sizes.large}
            style={{ width: 80, height: 80, borderRadius: BorderRadius.round }}
            onPressIn={() => { handleStartRecording(); }}
            onPressOut={() => { handleStopRecording(); }}
          />
        )}

        <Button
          link
          label="Close"
          color={Colors.textMuted}
          marginT-s5
          onPress={() => router.back()}
        />
      </View>
    </SafeAreaView>
  );
}
