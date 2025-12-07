import React, { useState } from 'react';
import { View, Text, TextField, Button, Colors } from 'react-native-ui-lib';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTransactionStore } from '../store/transaction-store';

export default function AddTransactionScreen() {
  const router = useRouter();
  const { addTransaction, recalculateSafeSpend } = useTransactionStore();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  const handleSave = () => {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) return;
    if (!description.trim()) return;

    addTransaction(value, description, category || 'Manual');
    recalculateSafeSpend();
    router.back();
  };

  const isValid = parseFloat(amount) > 0 && description.trim().length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.screenBG }}>
      <StatusBar style="dark" />

      <View padding-page flex>
        {/* Header */}
        <View row spread centerV marginB-s6>
          <Button
            link
            label="Cancel"
            color={Colors.textMuted}
            onPress={() => router.back()}
          />
          <Text h3 textDefault>Add Expense</Text>
          <Button
            link
            label="Save"
            color={isValid ? Colors.primary : Colors.textDisabled}
            labelStyle={{ fontWeight: '600' }}
            onPress={handleSave}
            disabled={!isValid}
          />
        </View>

        {/* Form */}
        <View marginB-s6>
          <TextField
            placeholder="0"
            floatingPlaceholder
            floatOnFocus
            label="Amount (₦)"
            labelStyle={{ color: Colors.textMuted }}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            autoFocus
            fieldStyle={{
              borderBottomWidth: 1,
              borderBottomColor: Colors.border,
              paddingBottom: 8,
            }}
            style={{
              fontSize: 48,
              fontWeight: '700',
              color: Colors.textDefault,
            }}
          />
        </View>

        <View marginB-s6>
          <TextField
            placeholder="What did you buy?"
            floatingPlaceholder
            floatOnFocus
            label="Description"
            labelStyle={{ color: Colors.textMuted }}
            value={description}
            onChangeText={setDescription}
            fieldStyle={{
              borderBottomWidth: 1,
              borderBottomColor: Colors.border,
              paddingBottom: 8,
            }}
            style={{
              fontSize: 18,
              color: Colors.textDefault,
            }}
          />
        </View>

        <View marginB-s6>
          <TextField
            placeholder="Food, Transport, etc."
            floatingPlaceholder
            floatOnFocus
            label="Category (Optional)"
            labelStyle={{ color: Colors.textMuted }}
            value={category}
            onChangeText={setCategory}
            fieldStyle={{
              borderBottomWidth: 1,
              borderBottomColor: Colors.border,
              paddingBottom: 8,
            }}
            style={{
              fontSize: 18,
              color: Colors.textDefault,
            }}
          />
        </View>

        {/* Spacer */}
        <View flex />

        {/* Save Button */}
        <Button
          label="Save Expense"
          backgroundColor={isValid ? Colors.primary : Colors.textDisabled}
          color={Colors.textInverse}
          borderRadius={20}
          disabled={!isValid}
          onPress={handleSave}
          marginB-s4
        />
      </View>
    </SafeAreaView>
  );
}
