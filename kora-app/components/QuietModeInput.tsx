/**
 * Quiet Mode Input Component
 *
 * Text input fallback for voice interaction.
 * Per spec: "For situations where voice isn't possible (public, meetings, quiet environments)"
 *
 * Features:
 * - Text input with send button
 * - Same AI analysis as voice
 * - Response shown as text with optional TTS
 * - Secondary to voice, not equal
 */

import React, { useState, useRef } from 'react';
import { View, Text, TextField, Button, Colors, TouchableOpacity } from 'react-native-ui-lib';
import { TextInput, Keyboard, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';

import { AIService } from '@/services/ai-service';
import { useTransactionStore } from '@/store/transaction-store';
import { useUserStore } from '@/store/user-store';
import { BorderRadius, Shadows } from '@/constants/design-system';

interface QuietModeInputProps {
  onClose: () => void;
}

type Intent = 'SPEND_DECISION' | 'SAFE_SPEND_CHECK' | 'EMOTIONAL' | 'POST_SPEND' | 'GENERAL';

export default function QuietModeInput({ onClose }: QuietModeInputProps) {
  const inputRef = useRef<TextInput>(null);

  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [koraResponse, setKoraResponse] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const { currentBalance, daysToPayday, safeSpendToday, transactions, addTransaction, recalculateSafeSpend } =
    useTransactionStore();
  const { income, payday, fixedExpenses, currency, savingsGoal, name } = useUserStore();

  const handleSend = async () => {
    if (!message.trim() || isProcessing) return;

    Keyboard.dismiss();
    setIsProcessing(true);
    setKoraResponse(null);

    try {
      // Calculate context (same as voice session)
      const today = new Date().toISOString().split('T')[0];
      const spentToday = transactions.filter((t) => t.date.startsWith(today)).reduce((sum, t) => sum + t.amount, 0);

      const totalFixedExpenses = fixedExpenses.reduce((sum, exp) => sum + exp.amount, 0);

      const monthStart = new Date();
      monthStart.setDate(1);
      const spentThisMonth = transactions
        .filter((t) => new Date(t.date) >= monthStart)
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
          upcomingBills: 0,
          flexibleRemaining,
        },
      };

      const response = await AIService.generateResponse(message.trim(), context);

      // Handle POST_SPEND intent (same as voice session)
      const intent = response.action as Intent;
      if (intent === 'POST_SPEND' && response.data?.logged) {
        const logged = response.data.logged as { amount: number; category: string };
        if (logged.amount && logged.amount > 0) {
          addTransaction(logged.amount, `Quiet mode: ${logged.category || 'expense'}`, logged.category || 'Quiet Mode');
          recalculateSafeSpend();
        }
      }

      setKoraResponse(response.text);
      setMessage('');
    } catch (error) {
      console.error('Quiet mode error:', error);
      setKoraResponse("I'm having trouble processing that. Try again?");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSpeak = async () => {
    if (!koraResponse || isSpeaking) return;

    setIsSpeaking(true);
    try {
      // Try ElevenLabs TTS first
      const audioUri = await AIService.speak(koraResponse);
      if (!audioUri) {
        // Fallback already handled by AIService with expo-speech
      }
    } catch {
      // Use native speech as fallback
      Speech.speak(koraResponse);
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleNewQuestion = () => {
    setKoraResponse(null);
    setMessage('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <View flex bg-screenBG padding-page>
      {/* Header */}
      <View row spread centerV marginB-s6>
        <Text h3 textDefault>
          Quiet Mode
        </Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Response Area */}
      {koraResponse ? (
        <View flex>
          <View bg-cardBG padding-card br20 style={Shadows.small} marginB-s4>
            <View row spread centerV marginB-s2>
              <Text caption textMuted>
                Kora says:
              </Text>
              <TouchableOpacity onPress={handleSpeak} disabled={isSpeaking}>
                <Ionicons
                  name={isSpeaking ? 'volume-high' : 'volume-medium-outline'}
                  size={20}
                  color={isSpeaking ? Colors.primary : Colors.textMuted}
                />
              </TouchableOpacity>
            </View>
            <Text body textDefault>
              {koraResponse}
            </Text>
          </View>

          <Button
            label="Ask another question"
            link
            color={Colors.primary}
            onPress={handleNewQuestion}
          />
        </View>
      ) : (
        <View flex>
          <Text body textMuted marginB-s4>
            Type your question like you would say it:
          </Text>
          <Text caption textMuted marginB-s2>
            Examples: &quot;Can I afford a ₦15k dinner?&quot; or &quot;I just spent ₦5k on transport&quot;
          </Text>
        </View>
      )}

      {/* Input Area */}
      {!koraResponse && (
        <View marginT-s4>
          <View
            row
            centerV
            bg-cardBG
            paddingH-s3
            paddingV-s2
            style={{ borderRadius: BorderRadius.large }}
          >
            <TextField
              ref={inputRef}
              placeholder="Type your message..."
              placeholderTextColor={Colors.textDisabled}
              value={message}
              onChangeText={setMessage}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              multiline
              maxLength={200}
              style={{
                flex: 1,
                fontSize: 16,
                color: Colors.textDefault,
                maxHeight: 100,
                paddingVertical: 8,
              }}
              containerStyle={{ flex: 1 }}
              fieldStyle={{ minHeight: 40 }}
              hideUnderline
            />

            <TouchableOpacity
              onPress={handleSend}
              disabled={!message.trim() || isProcessing}
              style={{ marginLeft: 8 }}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <View
                  center
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: BorderRadius.round,
                    backgroundColor: message.trim() ? Colors.primary : Colors.textDisabled,
                  }}
                >
                  <Ionicons name="send" size={18} color={Colors.textInverse} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
