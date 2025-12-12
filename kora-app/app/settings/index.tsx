import React from 'react';
import { View, Text, Button, Switch, ListItem, Colors } from 'react-native-ui-lib';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Alert } from 'react-native';

import { useUserStore } from '../../store/user-store';
import { useTransactionStore } from '../../store/transaction-store';
import { BorderRadius, Shadows } from '../../constants/design-system';

export default function SettingsScreen() {
  const router = useRouter();
  const { income, payday, fixedExpenses, resetUser } = useUserStore();
  const { resetTransactions } = useTransactionStore();

  const handleReset = () => {
    Alert.alert(
      'Reset App',
      'Are you sure you want to wipe all data? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetUser();
            resetTransactions();
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  const totalFixed = fixedExpenses.reduce((sum, item) => sum + item.amount, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.screenBG }}>
      <StatusBar style="dark" />
      <View flex padding-page>
        {/* Header */}
        <View row spread centerV marginB-s8>
          <Button
            link
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={24} color={Colors.textDefault} />
          </Button>
          <Text h3 textDefault>Settings</Text>
          <View width={24} />
        </View>

        {/* Profile Section */}
        <View marginB-s8>
          <Text h2 textDefault marginB-s4>
            Profile
          </Text>

          <View
            bg-cardBG
            padding-card
            style={[Shadows.small, { borderRadius: BorderRadius.large }]}
          >
            <ListItem height={50}>
              <ListItem.Part containerStyle={{ flex: 1 }}>
                <Text body textMuted>Monthly Income</Text>
              </ListItem.Part>
              <ListItem.Part>
                <Text body textDefault>₦{(income || 0).toLocaleString()}</Text>
              </ListItem.Part>
            </ListItem>

            <View height={1} bg-divider marginV-s2 />

            <ListItem height={50}>
              <ListItem.Part containerStyle={{ flex: 1 }}>
                <Text body textMuted>Payday</Text>
              </ListItem.Part>
              <ListItem.Part>
                <Text body textDefault>Day {payday || '?'}</Text>
              </ListItem.Part>
            </ListItem>

            <View height={1} bg-divider marginV-s2 />

            <ListItem height={50}>
              <ListItem.Part containerStyle={{ flex: 1 }}>
                <Text body textMuted>Fixed Expenses</Text>
              </ListItem.Part>
              <ListItem.Part>
                <Text body textDefault>₦{totalFixed.toLocaleString()}</Text>
              </ListItem.Part>
            </ListItem>
          </View>
        </View>

        {/* Preferences */}
        <View marginB-s8>
          <Text h2 textDefault marginB-s4>
            Preferences
          </Text>

          <View
            bg-cardBG
            padding-card
            style={[Shadows.small, { borderRadius: BorderRadius.large }]}
          >
            <ListItem height={50}>
              <ListItem.Part containerStyle={{ flex: 1 }}>
                <Text body textDefault>Quiet Mode</Text>
              </ListItem.Part>
              <ListItem.Part>
                <Switch value={false} onColor={Colors.primary} />
              </ListItem.Part>
            </ListItem>
          </View>
        </View>

        <View flex />

        {/* Danger Zone */}
        <View marginB-s4>
          <Button
            label="Reset App Data"
            outline
            outlineColor={Colors.error}
            color={Colors.error}
            borderRadius={BorderRadius.large}
            onPress={handleReset}
          />
          <Text center caption textMuted marginT-s3>
            Version 1.0.0 (Alpha)
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
