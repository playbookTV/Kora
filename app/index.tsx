import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, Link } from 'expo-router';

export default function HomeScreen() {
  const safeSpend = 5400;
  const currency = '₦';
  const daysToPayday = 8;

  return (
    <View style={styles.container}>
      {/* Hide the default header */}
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.topSpacer} />

      <View style={styles.centerContent}>
        <Text style={styles.label}>SAFE SPEND TODAY</Text>
        <Text style={styles.amount}>{currency}{safeSpend.toLocaleString()}</Text>
        <Text style={styles.subtext}>{daysToPayday} days to payday</Text>
        
        {/* Temporary Dev Link */}
        <Link href="/onboarding" asChild>
          <Pressable style={styles.devLink}>
            <Text style={styles.devLinkText}>Start Onboarding</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.bottomControls}>
        <View style={styles.micContainer}>
          <Pressable 
            style={({ pressed }) => [
              styles.micButton,
              pressed && styles.micButtonPressed
            ]}
          >
            <Ionicons name="mic" size={40} color="white" />
          </Pressable>
        </View>

        <Pressable style={styles.keyboardButton}>
          <Ionicons name="keypad" size={24} color="#666" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  topSpacer: {
    height: 40,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: '#888',
    letterSpacing: 2,
    marginBottom: 12,
    fontWeight: '600',
  },
  amount: {
    fontSize: 56,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -1,
  },
  subtext: {
    fontSize: 18,
    color: '#666',
    marginTop: 8,
    fontWeight: '400',
  },
  bottomControls: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 100,
  },
  micContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  micButtonPressed: {
    backgroundColor: '#333',
    transform: [{ scale: 0.95 }],
  },
  keyboardButton: {
    position: 'absolute',
    right: 40,
    bottom: 25,
    padding: 10,
  },
  devLink: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  devLinkText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
