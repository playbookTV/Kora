/**
 * Google OAuth Service
 *
 * Handles Google Sign-In using expo-auth-session and Supabase.
 */

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { TokenStorage } from './client';

// Complete any pending web browser sessions
WebBrowser.maybeCompleteAuthSession();

// Supabase project configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

/**
 * Get the redirect URI for the current platform
 */
export function getRedirectUri(): string {
  return AuthSession.makeRedirectUri({
    scheme: 'koraapp',
  });
}

/**
 * Build the Supabase OAuth URL for Google sign-in
 */
function buildGoogleAuthUrl(redirectUri: string): string {
  if (!SUPABASE_URL) {
    throw new Error('SUPABASE_URL is not configured');
  }

  const params = new URLSearchParams({
    provider: 'google',
    redirect_to: redirectUri,
  });

  return `${SUPABASE_URL}/auth/v1/authorize?${params.toString()}`;
}

/**
 * Parse the OAuth callback URL to extract tokens
 */
function parseAuthCallback(url: string): { accessToken: string; refreshToken: string } | null {
  try {
    // Supabase returns tokens in URL fragment (hash)
    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) return null;

    const hash = url.substring(hashIndex + 1);
    const params = new URLSearchParams(hash);

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) {
      return null;
    }

    return { accessToken, refreshToken };
  } catch {
    return null;
  }
}

export interface GoogleAuthResult {
  success: boolean;
  error?: string;
}

/**
 * Google OAuth API methods
 */
export const GoogleAuthAPI = {
  /**
   * Check if Google auth is configured
   */
  isConfigured(): boolean {
    return Boolean(SUPABASE_URL && GOOGLE_CLIENT_ID);
  },

  /**
   * Initiate Google Sign-In flow
   */
  async signIn(): Promise<GoogleAuthResult> {
    if (!SUPABASE_URL) {
      return { success: false, error: 'Google Sign-In is not configured' };
    }

    try {
      const redirectUri = getRedirectUri();
      const authUrl = buildGoogleAuthUrl(redirectUri);

      // Open the browser for OAuth flow
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type !== 'success') {
        if (result.type === 'cancel') {
          return { success: false, error: 'Sign-in was cancelled' };
        }
        return { success: false, error: 'Sign-in failed' };
      }

      // Parse the callback URL for tokens
      const tokens = parseAuthCallback(result.url);

      if (!tokens) {
        return { success: false, error: 'Failed to get authentication tokens' };
      }

      // Store tokens
      await TokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google Sign-In failed';
      return { success: false, error: message };
    }
  },
};

export default GoogleAuthAPI;
