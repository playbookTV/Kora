import React from 'react';
import { FlatList } from 'react-native';
import { View, Text, ListItem, Colors } from 'react-native-ui-lib';

import { useTransactionStore, Transaction } from '../store/transaction-store';
import { BorderRadius, Shadows } from '../constants/design-system';

function TransactionItem({ item }: Readonly<{ item: Transaction }>) {
  const date = new Date(item.date).toLocaleDateString();

  return (
    <View
      bg-cardBG
      marginB-s2
      style={[Shadows.small, { borderRadius: BorderRadius.large }]}
    >
      <ListItem
        height={60}
        containerStyle={{ paddingHorizontal: 16 }}
      >
        <ListItem.Part containerStyle={{ flex: 1 }}>
          <Text body textDefault>{item.description}</Text>
          <Text caption textMuted>{date} • {item.category}</Text>
        </ListItem.Part>
        <ListItem.Part>
          <Text body style={{ color: Colors.error }}>
            -₦{item.amount.toLocaleString()}
          </Text>
        </ListItem.Part>
      </ListItem>
    </View>
  );
}

export default function TransactionList() {
  const { transactions } = useTransactionStore();

  if (transactions.length === 0) {
    return (
      <View center marginT-s8>
        <Text textMuted caption>No transactions yet.</Text>
      </View>
    );
  }

  return (
    <View flex>
      <Text h2 textDefault marginB-s4 style={{ opacity: 0.8 }}>
        Recent
      </Text>
      <FlatList
        data={transactions}
        renderItem={({ item }) => <TransactionItem item={item} />}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );
}
