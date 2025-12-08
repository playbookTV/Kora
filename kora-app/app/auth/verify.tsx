/**
 * OTP Verification Screen
 *
 * Second step of authentication - user enters the OTP code sent to their phone.
 * Features auto-submit on complete, resend timer, and error handling.
 *
 * Follows Kora design principles: minimal UI, clear feedback.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextField, Button, Colors, TouchableOpacity } from 'react-native-ui-lib';
import { TextInput, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth-store';
import { useUserStore } from '@/store/user-store';
import { BorderRadius, Shadows } from '@/constants/design-system';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

export default function OTPVerifyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { verifyOTP, sendOTP, pendingPhone, isLoading, error, clearError } = useAuthStore();
  const { hasOnboarded } = useUserStore();

  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);

  const inputRef = useRef<TextInput>(null);

  // Focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  // Auto-submit when OTP is complete
  useEffect(() => {
    if (otp.length === OTP_LENGTH) {
      handleVerify();
    }
  }, [otp]);

  // Handle OTP input change
  const handleOtpChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH);
    setOtp(cleaned);
    if (error) clearError();
  };

  // Handle verify
  const handleVerify = async () => {
    if (otp.length !== OTP_LENGTH || isLoading) return;

    Keyboard.dismiss();
    const success = await verifyOTP(otp);

    if (success) {
      // Navigate based on onboarding status
      if (hasOnboarded) {
        router.replace('/');
      } else {
        router.replace('/onboarding');
      }
    }
  };

  // Handle resend OTP
  const handleResend = async () => {
    if (!canResend || !pendingPhone) return;

    setCanResend(false);
    setResendTimer(RESEND_COOLDOWN);
    setOtp('');
    clearError();

    await sendOTP(pendingPhone);
    inputRef.current?.focus();
  };

  // Go back to phone input
  const handleBack = () => {
    router.back();
  };

  // Format phone for display (mask middle digits)
  const formatPhone = (phone: string) => {
    if (!phone) return '';
    const last4 = phone.slice(-4);
    const countryCode = phone.slice(0, phone.length - 10);
    return `${countryCode} *** *** ${last4}`;
  };

  return (
    <View flex bg-screenBG padding-page style={{ paddingTop: insets.top + 20 }}>
      {/* Back Button */}
      <TouchableOpacity onPress={handleBack} style={{ marginBottom: 24 }}>
        <View row centerV>
          <Ionicons name="arrow-back" size={24} color={Colors.textDefault} />
          <Text body textDefault marginL-s2>
            Back
          </Text>
        </View>
      </TouchableOpacity>

      {/* Header */}
      <View marginB-s10>
        <Text h2 textDefault>
          Enter verification code
        </Text>
        <Text body textMuted marginT-s2>
          We sent a code to {formatPhone(pendingPhone || '')}
        </Text>
      </View>

      {/* OTP Input */}
      <View marginB-s6>
        <View
          row
          center
          bg-cardBG
          padding-s4
          style={[
            { borderRadius: BorderRadius.large },
            error ? { borderWidth: 1, borderColor: Colors.error } : {},
          ]}
        >
          {/* Hidden actual input */}
          <TextInput
            ref={inputRef}
            value={otp}
            onChangeText={handleOtpChange}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            style={{ position: 'absolute', opacity: 0 }}
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
          />

          {/* Visual OTP boxes */}
          <TouchableOpacity
            onPress={() => inputRef.current?.focus()}
            style={{ flexDirection: 'row' }}
          >
            {Array.from({ length: OTP_LENGTH }).map((_, index) => (
              <View
                key={index}
                center
                style={[
                  {
                    width: 44,
                    height: 56,
                    marginHorizontal: 4,
                    borderRadius: BorderRadius.medium,
                    borderWidth: 2,
                    borderColor:
                      index === otp.length
                        ? Colors.primary
                        : otp[index]
                          ? Colors.primary
                          : Colors.border,
                    backgroundColor: otp[index] ? Colors.primaryLight : 'transparent',
                  },
                ]}
              >
                <Text
                  h3
                  style={{
                    color: otp[index] ? Colors.textDefault : Colors.textDisabled,
                  }}
                >
                  {otp[index] || ''}
                </Text>
              </View>
            ))}
          </TouchableOpacity>
        </View>

        {/* Error Message */}
        {error && (
          <Text caption style={{ color: Colors.error }} marginT-s2 center>
            {error}
          </Text>
        )}
      </View>

      {/* Verify Button */}
      <Button
        label={isLoading ? 'Verifying...' : 'Verify'}
        disabled={otp.length !== OTP_LENGTH || isLoading}
        onPress={handleVerify}
        backgroundColor={otp.length === OTP_LENGTH ? Colors.primary : Colors.textDisabled}
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

      {/* Resend OTP */}
      <View center marginT-s6>
        {canResend ? (
          <TouchableOpacity onPress={handleResend}>
            <Text body style={{ color: Colors.primary }}>
              Resend code
            </Text>
          </TouchableOpacity>
        ) : (
          <Text body textMuted>
            Resend code in {resendTimer}s
          </Text>
        )}
      </View>
    </View>
  );
}
