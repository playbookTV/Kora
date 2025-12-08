/**
 * Phone Input Screen
 *
 * First step of authentication - user enters their phone number.
 * Supports Nigerian (+234) and UK (+44) phone numbers.
 *
 * Follows Kora design principles: minimal UI, voice-first mentality.
 */

import { useState, useCallback } from 'react';
import { View, Text, TextField, Button, Colors, TouchableOpacity } from 'react-native-ui-lib';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth-store';
import { BorderRadius, Shadows } from '@/constants/design-system';

// Country codes for geo-aware selection
const COUNTRY_CODES = [
  { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
] as const;

export default function PhoneInputScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { sendOTP, isLoading, error, clearError } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [countryIndex, setCountryIndex] = useState(0);

  const selectedCountry = COUNTRY_CODES[countryIndex];
  const fullPhoneNumber = `${selectedCountry.code}${phone.replace(/^0+/, '')}`;

  // Validate phone number
  const isValidPhone = useCallback(() => {
    const cleaned = phone.replace(/\D/g, '');
    if (selectedCountry.code === '+234') {
      // Nigerian numbers: 10-11 digits
      return cleaned.length >= 10 && cleaned.length <= 11;
    } else if (selectedCountry.code === '+44') {
      // UK numbers: 10-11 digits
      return cleaned.length >= 10 && cleaned.length <= 11;
    }
    return false;
  }, [phone, selectedCountry.code]);

  // Toggle country code
  const toggleCountry = () => {
    setCountryIndex((prev) => (prev + 1) % COUNTRY_CODES.length);
    clearError();
  };

  // Handle continue button
  const handleContinue = async () => {
    if (!isValidPhone()) return;

    clearError();
    const success = await sendOTP(fullPhoneNumber);
    if (success) {
      router.push('/auth/verify');
    }
  };

  return (
    <View flex bg-screenBG padding-page style={{ paddingTop: insets.top + 20 }}>
      {/* Header */}
      <View marginB-s10>
        <Text h2 textDefault>
          Welcome to Kora
        </Text>
        <Text body textMuted marginT-s2>
          Enter your phone number to get started
        </Text>
      </View>

      {/* Phone Input */}
      <View marginB-s6>
        <Text caption textMuted marginB-s2>
          Phone Number
        </Text>

        <View
          row
          centerV
          bg-cardBG
          paddingH-s4
          style={[
            { borderRadius: BorderRadius.large, height: 56 },
            error ? { borderWidth: 1, borderColor: Colors.error } : {},
          ]}
        >
          {/* Country Code Selector */}
          <TouchableOpacity onPress={toggleCountry} style={{ marginRight: 12 }}>
            <View row centerV>
              <Text body textDefault>
                {selectedCountry.flag} {selectedCountry.code}
              </Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={Colors.textMuted}
                style={{ marginLeft: 4 }}
              />
            </View>
          </TouchableOpacity>

          {/* Divider */}
          <View
            style={{
              width: 1,
              height: 24,
              backgroundColor: Colors.divider,
              marginRight: 12,
            }}
          />

          {/* Phone Number Input */}
          <TextField
            placeholder="812 345 6789"
            placeholderTextColor={Colors.textDisabled}
            value={phone}
            onChangeText={(text: string) => {
              setPhone(text.replace(/[^0-9]/g, ''));
              if (error) clearError();
            }}
            keyboardType="phone-pad"
            maxLength={11}
            style={{
              flex: 1,
              fontSize: 18,
              color: Colors.textDefault,
              height: '100%',
            }}
            containerStyle={{ flex: 1 }}
            fieldStyle={{ height: '100%' }}
            hideUnderline
          />
        </View>

        {/* Error Message */}
        {error && (
          <Text caption style={{ color: Colors.error }} marginT-s2>
            {error}
          </Text>
        )}
      </View>

      {/* Continue Button */}
      <Button
        label={isLoading ? 'Sending...' : 'Continue'}
        disabled={!isValidPhone() || isLoading}
        onPress={handleContinue}
        backgroundColor={isValidPhone() ? Colors.primary : Colors.textDisabled}
        disabledBackgroundColor={Colors.textDisabled}
        labelStyle={{
          color: Colors.textInverse,
          fontWeight: '600',
          fontSize: 16,
        }}
        style={[
          { height: 56, borderRadius: BorderRadius.large },
          Shadows.small,
        ]}
      />

      {/* Terms Notice */}
      <View flex bottom paddingB-s6>
        <Text caption textMuted center>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
}
