/**
 * Sync Service
 *
 * Handles bidirectional sync between local stores and backend.
 * Implements offline-first approach with conflict resolution.
 */

import { UsersAPI, TransactionsAPI } from './api';
import type { UserProfile, FixedExpense, Transaction } from './api';
import { useUserStore } from '@/store/user-store';
import { useTransactionStore } from '@/store/transaction-store';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface SyncResult {
  success: boolean;
  error?: string;
  profileSynced: boolean;
  transactionsSynced: number;
}

/**
 * Sync Service - manages data synchronization
 */
export const SyncService = {
  /**
   * Pull user profile from backend and update local store
   */
  async pullProfile(): Promise<UserProfile | null> {
    try {
      const profile = await UsersAPI.getProfile();
      const userStore = useUserStore.getState();

      // Update local store with backend data
      if (profile.income) userStore.setIncome(profile.income);
      if (profile.payday) userStore.setPayday(profile.payday);
      if (profile.current_balance !== undefined) {
        useTransactionStore.getState().setBalance(profile.current_balance);
      }
      if (profile.savings_goal) userStore.setSavingsGoal(profile.savings_goal);
      if (profile.currency) userStore.setCurrency(profile.currency);
      if (profile.has_onboarded) userStore.setHasOnboarded(true);

      return profile;
    } catch (error) {
      console.error('Failed to pull profile:', error);
      return null;
    }
  },

  /**
   * Push local profile to backend
   */
  async pushProfile(): Promise<boolean> {
    try {
      const userStore = useUserStore.getState();
      const transactionStore = useTransactionStore.getState();

      await UsersAPI.updateProfile({
        income: userStore.income || undefined,
        payday: userStore.payday || undefined,
        current_balance: transactionStore.currentBalance || undefined,
        savings_goal: userStore.savingsGoal || undefined,
        currency: userStore.currency,
      });

      return true;
    } catch (error) {
      console.error('Failed to push profile:', error);
      return false;
    }
  },

  /**
   * Pull fixed expenses from backend
   */
  async pullExpenses(): Promise<FixedExpense[]> {
    try {
      const expenses = await UsersAPI.getExpenses();
      const userStore = useUserStore.getState();

      // Convert backend format to local format
      const localExpenses = expenses.map((e) => ({
        name: e.name,
        amount: e.amount,
        dueDay: e.due_day,
      }));

      userStore.setFixedExpenses(localExpenses);
      return expenses;
    } catch (error) {
      console.error('Failed to pull expenses:', error);
      return [];
    }
  },

  /**
   * Push local expenses to backend (sync all)
   */
  async pushExpenses(): Promise<boolean> {
    try {
      const userStore = useUserStore.getState();
      const backendExpenses = await UsersAPI.getExpenses();

      // Delete all existing backend expenses
      for (const expense of backendExpenses) {
        await UsersAPI.deleteExpense(expense.id);
      }

      // Create all local expenses on backend
      for (const expense of userStore.fixedExpenses) {
        await UsersAPI.createExpense({
          name: expense.name,
          amount: expense.amount,
          due_day: expense.dueDay ?? undefined,
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to push expenses:', error);
      return false;
    }
  },

  /**
   * Pull transactions from backend
   */
  async pullTransactions(limit = 100): Promise<Transaction[]> {
    try {
      const { transactions } = await TransactionsAPI.getTransactions({ limit });
      const transactionStore = useTransactionStore.getState();

      // Merge with local transactions (backend takes precedence for same IDs)
      const localTransactions = transactionStore.transactions;
      const mergedMap = new Map<string, typeof localTransactions[0]>();

      // Add local transactions first
      for (const t of localTransactions) {
        // Only add if it doesn't look like it's already in the backend list
        // (Poor man's deduplication for 'local_' ids)
        const isDuplicate = transactions.some(bt =>
          bt.amount === t.amount &&
          bt.description === t.description &&
          new Date(bt.date).toDateString() === new Date(t.date).toDateString()
        );

        if (!isDuplicate || !t.id.startsWith('local_')) {
          mergedMap.set(t.id, t);
        }
      }

      // Override/add backend transactions
      for (const t of transactions) {
        mergedMap.set(t.id, {
          id: t.id,
          amount: t.amount,
          category: t.category,
          description: t.description,
          date: t.date,
        });
      }

      // Update store with merged transactions
      const merged = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      transactionStore.setTransactions(merged);
      return transactions;
    } catch (error) {
      console.error('Failed to pull transactions:', error);
      return [];
    }
  },

  /**
   * Push a single transaction to backend
   */
  async pushTransaction(transaction: {
    amount: number;
    description: string;
    category?: string;
    date?: string;
  }): Promise<Transaction | null> {
    try {
      const created = await TransactionsAPI.createTransaction({
        amount: transaction.amount,
        description: transaction.description,
        category: transaction.category,
        date: transaction.date,
      });
      return created;
    } catch (error) {
      console.error('Failed to push transaction:', error);
      return null;
    }
  },

  /**
   * Full sync - pull all data from backend
   */
  async fullPull(): Promise<SyncResult> {
    try {
      const profile = await this.pullProfile();
      await this.pullExpenses();
      const transactions = await this.pullTransactions();

      // Recalculate safe spend after sync
      useTransactionStore.getState().recalculateSafeSpend();

      return {
        success: true,
        profileSynced: !!profile,
        transactionsSynced: transactions.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
        profileSynced: false,
        transactionsSynced: 0,
      };
    }
  },

  /**
   * Full sync - push all local data to backend
   */
  async fullPush(): Promise<SyncResult> {
    try {
      const profilePushed = await this.pushProfile();
      const expensesPushed = await this.pushExpenses();

      // Note: We don't push all transactions, only new ones
      // Backend transactions are created via API calls

      return {
        success: profilePushed && expensesPushed,
        profileSynced: profilePushed,
        transactionsSynced: 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
        profileSynced: false,
        transactionsSynced: 0,
      };
    }
  },

  /**
   * Complete onboarding and sync to backend
   */
  async completeOnboarding(): Promise<boolean> {
    try {
      // Push profile and expenses first
      await this.pushProfile();
      await this.pushExpenses();

      // Mark onboarding complete on backend
      await UsersAPI.completeOnboarding();

      // Update local store
      useUserStore.getState().setHasOnboarded(true);

      return true;
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      return false;
    }
  },
};

export default SyncService;
