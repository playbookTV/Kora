import React from 'react';
import { View, Text, Button, Colors } from 'react-native-ui-lib';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTransactionStore } from '../store/transaction-store';
import TransactionList from '../components/TransactionList';
import { getSafeSpendColor, BorderRadius } from '../constants/design-system';

const PlusIcon = () => <Feather name="plus" size={24} color={Colors.textDefault} />;
const MicIcon = () => <Feather name="mic" size={32} color={Colors.textInverse} />;
const SettingsIcon = () => <Feather name="settings" size={24} color={Colors.textDefault} />;

export default function HomeScreen() {
  const router = useRouter();
  const { safeSpendToday, daysToPayday, currentBalance } = useTransactionStore();

  const handleMicPress = () => {
    router.push('/voice-session');
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
        <View height={100} row bottom spread>
          {/* Add Manual Transaction Button */}
          <Button
            iconSource={PlusIcon}
            link
            onPress={() => router.push('/add-transaction')}
            style={{ alignSelf: 'flex-end', marginBottom: 20 }}
          />

          {/* Mic Button (Center) */}
          <View
            centerH
            style={{ position: 'absolute', left: 0, right: 0, bottom: 20 }}
            pointerEvents="box-none"
          >
            <Button
              round
              backgroundColor={Colors.primary}
              iconSource={MicIcon}
              size={Button.sizes.large}
              style={{ width: 80, height: 80, borderRadius: BorderRadius.round }}
              onPress={handleMicPress}
            />
          </View>

          {/* Settings Button */}
          <Button
            iconSource={SettingsIcon}
            link
            onPress={() => router.push('/settings')}
            style={{ alignSelf: 'flex-end', marginBottom: 20 }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
