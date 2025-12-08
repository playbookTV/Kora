import React, { useState } from 'react';
import { View, Text, Button, Colors, TouchableOpacity, Modal } from 'react-native-ui-lib';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTransactionStore } from '../store/transaction-store';
import TransactionList from '../components/TransactionList';
import QuietModeInput from '../components/QuietModeInput';
import { getSafeSpendColor, BorderRadius } from '../constants/design-system';

const PlusIcon = () => <Feather name="plus" size={24} color={Colors.textDefault} />;
const MicIcon = () => <Feather name="mic" size={32} color={Colors.textInverse} />;
const SettingsIcon = () => <Feather name="settings" size={24} color={Colors.textDefault} />;
const KeyboardIcon = () => <Ionicons name="keypad-outline" size={20} color={Colors.textMuted} />;
const InsightsIcon = () => <Ionicons name="analytics-outline" size={20} color={Colors.textMuted} />;

export default function HomeScreen() {
  const router = useRouter();
  const { safeSpendToday, daysToPayday, currentBalance } = useTransactionStore();

  // Quiet mode state
  const [quietModeVisible, setQuietModeVisible] = useState(false);

  const handleMicPress = () => {
    router.push('/voice-session');
  };

  const handleQuietModeToggle = () => {
    setQuietModeVisible(true);
  };

  // Calculate daily budget for color coding
  const dailyBudget = daysToPayday > 0 ? currentBalance / daysToPayday : 0;
  const safeSpendColor = getSafeSpendColor(safeSpendToday, dailyBudget);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.screenBG }}>
      <StatusBar style="dark" />

      <View flex padding-page>
        {/* Top Spacer */}
        <View height={40} />

        {/* Center Content: Safe Spend */}
        <View center marginB-s8>
          <Text caption textMuted marginB-s2 style={{ letterSpacing: 1.5 }}>
            SAFE SPEND TODAY
          </Text>
          <Text h1 style={{ color: safeSpendColor }}>
            ₦{safeSpendToday.toLocaleString()}
          </Text>
          <Text body textMuted marginT-s3>
            {daysToPayday} {daysToPayday === 1 ? 'day' : 'days'} to payday
          </Text>
        </View>

        {/* Transaction History */}
        <View flex>
          <TransactionList />
        </View>

        {/* Interaction Area */}
        <View height={120} bottom>
          {/* Quiet Mode Toggle - Small keyboard icon below mic */}
          <View row spread centerV marginB-s3>
            {/* Add Manual Transaction Button */}
            <Button
              iconSource={PlusIcon}
              link
              onPress={() => router.push('/add-transaction')}
            />

            {/* Center Actions */}
            <View row centerV>
              {/* Quiet Mode Toggle */}
              <TouchableOpacity onPress={handleQuietModeToggle} style={{ padding: 8, marginRight: 16 }}>
                <View row centerV>
                  <KeyboardIcon />
                  <Text caption textMuted marginL-s1>
                    Quiet
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Insights Button */}
              <TouchableOpacity onPress={() => router.push('/insights')} style={{ padding: 8 }}>
                <View row centerV>
                  <InsightsIcon />
                  <Text caption textMuted marginL-s1>
                    Insights
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Settings Button */}
            <Button
              iconSource={SettingsIcon}
              link
              onPress={() => router.push('/settings')}
            />
          </View>

          {/* Mic Button (Center) */}
          <View centerH marginB-s4>
            <Button
              round
              backgroundColor={Colors.primary}
              iconSource={MicIcon}
              size={Button.sizes.large}
              style={{ width: 80, height: 80, borderRadius: BorderRadius.round }}
              onPress={handleMicPress}
            />
          </View>
        </View>
      </View>

      {/* Quiet Mode Modal */}
      <Modal visible={quietModeVisible} animationType="slide" onRequestClose={() => setQuietModeVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.screenBG }}>
          <QuietModeInput onClose={() => setQuietModeVisible(false)} />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
