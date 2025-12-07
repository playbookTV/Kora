import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Button, LoaderScreen, Colors } from 'react-native-ui-lib';
import { Audio } from 'expo-av';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTransactionStore } from '../store/transaction-store';
import { AIService } from '../services/ai-service';
import { BorderRadius, Shadows } from '../constants/design-system';

const MicOnIcon = () => <Feather name="mic" size={32} color={Colors.textInverse} />;
const MicOffIcon = () => <Feather name="mic-off" size={32} color={Colors.textInverse} />;

export default function VoiceSession() {
  const router = useRouter();
  const { updateSafeSpend, recalculateSafeSpend, currentBalance, daysToPayday } = useTransactionStore();

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
    await recording.current.stopAndUnloadAsync();
    const uri = recording.current.getURI();
    if (uri) processUserAudio(uri);
    else setIsProcessing(false);
  };

  const processUserAudio = async (uri: string) => {
    try {
      const text = await AIService.transcribe(uri);

      const context = {
        mode: 'GENERAL',
        currentBalance,
        daysToPayday,
      };

      const response = await AIService.generateResponse(text, context);

      if (response.data) {
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
            onPressIn={handleStartRecording}
            onPressOut={handleStopRecording}
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
