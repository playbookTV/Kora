/**
 * Authentication Store
 *
 * Manages authentication state using Zustand with MMKV persistence.
 * Handles login, logout, and session management.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import { AuthAPI, TokenStorage } from '@/services/api';
import type { AuthUser } from '@/services/api';

// MMKV storage instance for auth
const authStorage = new MMKV({ id: 'kora-auth-storage' });

// Zustand storage adapter for MMKV
const zustandAuthStorage = {
  getItem: (name: string) => {
    const value = authStorage.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string) => {
    authStorage.set(name, value);
  },
  removeItem: (name: string) => {
    authStorage.delete(name);
  },
};

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  // State
  user: AuthUser | null;
  status: AuthStatus;
  error: string | null;
  isLoading: boolean;

  // Phone verification state
  pendingPhone: string | null;
  otpSent: boolean;

  // Actions
  sendOTP: (phone: string) => Promise<boolean>;
  verifyOTP: (code: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  user: null,
  status: 'idle' as AuthStatus,
  error: null,
  isLoading: false,
  pendingPhone: null,
  otpSent: false,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      /**
       * Send OTP to phone number (signup or login)
       */
      sendOTP: async (phone: string) => {
        set({ isLoading: true, error: null });

        try {
          // Try login first (existing user)
          await AuthAPI.login(phone);
          set({ pendingPhone: phone, otpSent: true, isLoading: false });
          return true;
        } catch {
          // If login fails, try signup (new user)
          try {
            await AuthAPI.signup(phone);
            set({ pendingPhone: phone, otpSent: true, isLoading: false });
            return true;
          } catch (signupError) {
            const message =
              signupError instanceof Error ? signupError.message : 'Failed to send OTP';
            set({ error: message, isLoading: false });
            return false;
          }
        }
      },

      /**
       * Verify OTP code
       */
      verifyOTP: async (code: string) => {
        const { pendingPhone } = get();
        if (!pendingPhone) {
          set({ error: 'No phone number pending verification' });
          return false;
        }

        set({ isLoading: true, error: null });

        try {
          const { user } = await AuthAPI.verifyOTP(pendingPhone, code);
          set({
            user,
            status: 'authenticated',
            isLoading: false,
            pendingPhone: null,
            otpSent: false,
          });
          return true;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Invalid OTP';
          set({ error: message, isLoading: false });
          return false;
        }
      },

      /**
       * Logout user
       */
      logout: async () => {
        set({ isLoading: true });
        try {
          await AuthAPI.logout();
        } finally {
          set({
            ...initialState,
            status: 'unauthenticated',
          });
        }
      },

      /**
       * Check if user is authenticated (on app start)
       */
      checkAuth: async () => {
        set({ status: 'loading' });

        try {
          const isAuth = await AuthAPI.isAuthenticated();
          if (isAuth) {
            const { user } = await AuthAPI.me();
            set({ user, status: 'authenticated' });
            return true;
          } else {
            set({ status: 'unauthenticated' });
            return false;
          }
        } catch {
          set({ status: 'unauthenticated' });
          return false;
        }
      },

      /**
       * Clear error message
       */
      clearError: () => {
        set({ error: null });
      },

      /**
       * Reset auth state (for testing/debugging)
       */
      reset: () => {
        TokenStorage.clearTokens();
        set(initialState);
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => zustandAuthStorage),
      partialize: (state) => ({
        user: state.user,
        status: state.status,
      }),
    }
  )
);

export default useAuthStore;
