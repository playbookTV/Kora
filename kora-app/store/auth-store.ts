/**
 * Authentication Store
 *
 * Manages authentication state using Zustand with AsyncStorage persistence.
 * Handles login, signup, logout, and session management.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthAPI, GoogleAuthAPI, TokenStorage } from '@/services/api';
import type { AuthUser } from '@/services/api';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
export type AuthMode = 'login' | 'signup';

interface AuthState {
  // State
  user: AuthUser | null;
  status: AuthStatus;
  error: string | null;
  isLoading: boolean;

  // Auth flow state
  pendingEmail: string | null;
  authMode: AuthMode;

  // Actions
  setAuthMode: (mode: AuthMode) => void;
  setPendingEmail: (email: string) => void;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name?: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
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
  pendingEmail: null,
  authMode: 'login' as AuthMode,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialState,

      /**
       * Set auth mode (login or signup)
       */
      setAuthMode: (mode: AuthMode) => {
        set({ authMode: mode, error: null });
      },

      /**
       * Set pending email for auth flow
       */
      setPendingEmail: (email: string) => {
        set({ pendingEmail: email });
      },

      /**
       * Login with email and password
       */
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const { user } = await AuthAPI.login(email, password);
          set({
            user,
            status: 'authenticated',
            isLoading: false,
            pendingEmail: null,
          });
          return true;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed';
          set({ error: message, isLoading: false });
          return false;
        }
      },

      /**
       * Signup with email and password
       */
      signup: async (email: string, password: string, name?: string) => {
        set({ isLoading: true, error: null });

        try {
          const { user } = await AuthAPI.signup(email, password, name);
          set({
            user,
            status: 'authenticated',
            isLoading: false,
            pendingEmail: null,
          });
          return true;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Signup failed';
          set({ error: message, isLoading: false });
          return false;
        }
      },

      /**
       * Sign in with Google OAuth
       */
      signInWithGoogle: async () => {
        set({ isLoading: true, error: null });

        try {
          const result = await GoogleAuthAPI.signIn();

          if (!result.success) {
            set({ error: result.error || 'Google sign-in failed', isLoading: false });
            return false;
          }

          // Fetch user data after successful OAuth
          const { user } = await AuthAPI.me();
          set({
            user,
            status: 'authenticated',
            isLoading: false,
          });
          return true;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Google sign-in failed';
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
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        status: state.status,
      }),
    }
  )
);

export default useAuthStore;
