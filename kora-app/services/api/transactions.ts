/**
 * Transactions API Service
 *
 * Handles transaction CRUD and spending statistics.
 */

import apiClient, { getErrorMessage, ApiResponse } from './client';

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  created_at: string;
}

export interface TransactionStats {
  totalSpent: number;
  spentToday: number;
  dailyAverage: number;
  topCategories: {
    category: string;
    total: number;
    count: number;
  }[];
}

export interface CreateTransactionData {
  amount: number;
  category?: string;
  description: string;
  date?: string;
}

export interface TransactionQueryParams {
  limit?: number;
  offset?: number;
  category?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Transactions API methods
 */
export const TransactionsAPI = {
  /**
   * Get transactions with optional filtering
   */
  async getTransactions(params: TransactionQueryParams = {}): Promise<{
    transactions: Transaction[];
    total: number;
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());
      if (params.category) queryParams.append('category', params.category);
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);

      const response = await apiClient.get<
        ApiResponse<{ transactions: Transaction[]; total: number }>
      >(`/transactions?${queryParams.toString()}`);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get transactions');
      }

      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get a single transaction by ID
   */
  async getTransaction(id: string): Promise<Transaction> {
    try {
      const response = await apiClient.get<ApiResponse<{ transaction: Transaction }>>(
        `/transactions/${id}`
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get transaction');
      }

      return response.data.data.transaction;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Create a new transaction
   */
  async createTransaction(data: CreateTransactionData): Promise<Transaction> {
    try {
      const response = await apiClient.post<ApiResponse<{ transaction: Transaction }>>(
        '/transactions',
        {
          ...data,
          date: data.date || new Date().toISOString(),
          category: data.category || 'Uncategorized',
        }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to create transaction');
      }

      return response.data.data.transaction;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Delete a transaction
   */
  async deleteTransaction(id: string): Promise<void> {
    try {
      const response = await apiClient.delete<ApiResponse<null>>(`/transactions/${id}`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete transaction');
      }
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get spending statistics (last 30 days)
   */
  async getStats(): Promise<TransactionStats> {
    try {
      const response = await apiClient.get<ApiResponse<TransactionStats>>('/transactions/stats');

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get stats');
      }

      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};

export default TransactionsAPI;
