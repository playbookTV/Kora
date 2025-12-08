/**
 * Authentication API Service
 *
 * Handles all authentication-related API calls including signup, login,
 * and session management using email/password.
 */

import apiClient, { TokenStorage, getErrorMessage, ApiResponse } from './client';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  created_at: string;
}

export interface SignupResponse {
  user: AuthUser;
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };
}

export interface LoginResponse {
  user: AuthUser;
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };
}

export interface MeResponse {
  user: AuthUser;
}

/**
 * Authentication API methods
 */
export const AuthAPI = {
  /**
   * Register a new user with email and password
   */
  async signup(email: string, password: string, name?: string): Promise<SignupResponse> {
    try {
      const response = await apiClient.post<ApiResponse<SignupResponse>>('/auth/signup', {
        email,
        password,
        name,
      });

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Signup failed');
      }

      const { session } = response.data.data;

      // Store tokens securely
      if (session) {
        await TokenStorage.setTokens(session.access_token, session.refresh_token);
      }

      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', {
        email,
        password,
      });

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Login failed');
      }

      const { session } = response.data.data;

      // Store tokens securely
      await TokenStorage.setTokens(session.access_token, session.refresh_token);

      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get current authenticated user
   */
  async me(): Promise<MeResponse> {
    try {
      const response = await apiClient.get<ApiResponse<MeResponse>>('/auth/me');

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get user');
      }

      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Logout and clear tokens
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore logout errors - we'll clear tokens anyway
    } finally {
      await TokenStorage.clearTokens();
    }
  },

  /**
   * Check if user is authenticated (has valid token)
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await TokenStorage.getAccessToken();
    if (!token) return false;

    try {
      await this.me();
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = await TokenStorage.getRefreshToken();
      if (!refreshToken) return false;

      const response = await apiClient.post<
        ApiResponse<{ access_token: string; refresh_token: string }>
      >('/auth/refresh', {
        refresh_token: refreshToken,
      });

      if (!response.data.success || !response.data.data) {
        return false;
      }

      const { access_token, refresh_token } = response.data.data;
      await TokenStorage.setTokens(access_token, refresh_token);
      return true;
    } catch {
      await TokenStorage.clearTokens();
      return false;
    }
  },
};

export default AuthAPI;
