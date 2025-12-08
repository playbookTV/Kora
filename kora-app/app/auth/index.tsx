/**
 * Auth Screen
 *
 * Combined login/signup screen with email and password.
 * Users can toggle between login and signup modes.
 */

import { useState, useCallback } from 'react';
import { View, Text, Button, Colors, TouchableOpacity } from 'react-native-ui-lib';
import { TextInput, Keyboard, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth-store';
import { useUserStore } from '@/store/user-store';
import { BorderRadius, Shadows } from '@/constants/design-system';

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { login, signup, isLoading, error, clearError, authMode, setAuthMode } = useAuthStore();
  const { hasOnboarded } = useUserStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isSignup = authMode === 'signup';

  // Validate email
  const isValidEmail = useCallback(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, [email]);

  // Validate password
  const isValidPassword = useCallback(() => {
    return password.length >= 8;
  }, [password]);

  // Validate form
  const isValidForm = useCallback(() => {
    return isValidEmail() && isValidPassword();
  }, [isValidEmail, isValidPassword]);

  // Handle submit
  const handleSubmit = async () => {
    if (!isValidForm()) return;

    Keyboard.dismiss();
    clearError();

    let success: boolean;
    if (isSignup) {
      success = await signup(email, password, name || undefined);
    } else {
      success = await login(email, password);
    }

    if (success) {
      if (hasOnboarded) {
        router.replace('/');
      } else {
        router.replace('/onboarding');
      }
    }
  };

  // Toggle auth mode
  const toggleAuthMode = () => {
    setAuthMode(isSignup ? 'login' : 'signup');
    clearError();
  };

  return (
    <View flex bg-screenBG padding-page style={{ paddingTop: insets.top + 20 }}>
      {/* Header */}
      <View marginB-s8>
        <Text h2 textDefault>
          {isSignup ? 'Create Account' : 'Welcome Back'}
        </Text>
        <Text body textMuted marginT-s2>
          {isSignup
            ? 'Sign up to start managing your spending'
            : 'Sign in to continue to Kora'}
        </Text>
      </View>

      {/* Name Input (Signup only) */}
      {isSignup && (
        <View marginB-s4>
          <Text caption textMuted marginB-s2>
            Name (optional)
          </Text>
          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Your name"
              placeholderTextColor={Colors.textDisabled}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              style={styles.input}
            />
          </View>
        </View>
      )}

      {/* Email Input */}
      <View marginB-s4>
        <Text caption textMuted marginB-s2>
          Email
        </Text>
        <View style={[
          styles.inputContainer,
          error && !isValidEmail() ? styles.inputError : {},
        ]}>
          <TextInput
            placeholder="you@example.com"
            placeholderTextColor={Colors.textDisabled}
            value={email}
            onChangeText={(text: string) => {
              setEmail(text.toLowerCase().trim());
              if (error) clearError();
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
        </View>
      </View>

      {/* Password Input */}
      <View marginB-s6>
        <Text caption textMuted marginB-s2>
          Password
        </Text>
        <View style={[
          styles.inputContainer,
          styles.passwordContainer,
          error ? styles.inputError : {},
        ]}>
          <TextInput
            placeholder={isSignup ? 'At least 8 characters' : 'Enter password'}
            placeholderTextColor={Colors.textDisabled}
            value={password}
            onChangeText={(text: string) => {
              setPassword(text);
              if (error) clearError();
            }}
            secureTextEntry={!showPassword}
            style={[styles.input, { flex: 1 }]}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ paddingLeft: 12 }}>
            <Text caption style={{ color: Colors.primary }}>
              {showPassword ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        </View>
        {isSignup && password.length > 0 && password.length < 8 && (
          <Text caption style={{ color: Colors.warning }} marginT-s1>
            Password must be at least 8 characters
          </Text>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <View marginB-s4>
          <Text caption style={{ color: Colors.error }}>
            {error}
          </Text>
        </View>
      )}

      {/* Submit Button */}
      <Button
        label={isLoading ? (isSignup ? 'Creating...' : 'Signing in...') : (isSignup ? 'Create Account' : 'Sign In')}
        disabled={!isValidForm() || isLoading}
        onPress={handleSubmit}
        backgroundColor={isValidForm() ? Colors.primary : Colors.textDisabled}
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

      {/* Toggle Auth Mode */}
      <View center marginT-s6>
        <TouchableOpacity onPress={toggleAuthMode}>
          <Text body textMuted>
            {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            <Text style={{ color: Colors.primary, fontWeight: '600' }}>
              {isSignup ? 'Sign In' : 'Sign Up'}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Terms Notice */}
      <View flex bottom paddingB-s6>
        <Text caption textMuted center>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    backgroundColor: Colors.cardBG,
    borderRadius: BorderRadius.large,
    height: 56,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputError: {
    borderWidth: 1,
    borderColor: Colors.error,
  },
  input: {
    fontSize: 16,
    color: Colors.textDefault,
  },
});
