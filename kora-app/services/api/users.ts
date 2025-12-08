/**
 * Users API Service
 *
 * Handles user profile and fixed expenses management.
 */

import apiClient, { getErrorMessage, ApiResponse } from './client';

export interface UserProfile {
  id: string;
  name?: string;
  income?: number;
  payday?: number;
  current_balance?: number;
  savings_goal?: number;
  currency: 'NGN' | 'GBP';
  has_onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface FixedExpense {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_day?: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileData {
  name?: string;
  income?: number;
  payday?: number;
  current_balance?: number;
  savings_goal?: number;
  currency?: 'NGN' | 'GBP';
}

export interface CreateExpenseData {
  name: string;
  amount: number;
  due_day?: number;
}

/**
 * Users API methods
 */
export const UsersAPI = {
  /**
   * Get current user's profile
   */
  async getProfile(): Promise<UserProfile> {
    try {
      const response = await apiClient.get<ApiResponse<{ profile: UserProfile }>>('/users/profile');

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get profile');
      }

      return response.data.data.profile;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    try {
      const response = await apiClient.put<ApiResponse<{ profile: UserProfile }>>(
        '/users/profile',
        data
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to update profile');
      }

      return response.data.data.profile;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Mark onboarding as complete
   */
  async completeOnboarding(): Promise<UserProfile> {
    try {
      const response = await apiClient.post<ApiResponse<{ profile: UserProfile }>>(
        '/users/complete-onboarding'
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to complete onboarding');
      }

      return response.data.data.profile;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get all fixed expenses
   */
  async getExpenses(): Promise<FixedExpense[]> {
    try {
      const response = await apiClient.get<ApiResponse<{ expenses: FixedExpense[] }>>(
        '/users/expenses'
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get expenses');
      }

      return response.data.data.expenses;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Create a new fixed expense
   */
  async createExpense(data: CreateExpenseData): Promise<FixedExpense> {
    try {
      const response = await apiClient.post<ApiResponse<{ expense: FixedExpense }>>(
        '/users/expenses',
        data
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to create expense');
      }

      return response.data.data.expense;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Update a fixed expense
   */
  async updateExpense(id: string, data: Partial<CreateExpenseData>): Promise<FixedExpense> {
    try {
      const response = await apiClient.put<ApiResponse<{ expense: FixedExpense }>>(
        `/users/expenses/${id}`,
        data
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to update expense');
      }

      return response.data.data.expense;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Delete a fixed expense
   */
  async deleteExpense(id: string): Promise<void> {
    try {
      const response = await apiClient.delete<ApiResponse<null>>(`/users/expenses/${id}`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete expense');
      }
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Delete user account
   */
  async deleteAccount(): Promise<void> {
    try {
      const response = await apiClient.delete<ApiResponse<null>>('/users/account');

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete account');
      }
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};

export default UsersAPI;
