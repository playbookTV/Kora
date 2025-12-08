import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage, useUserStore } from './user-store'; // Reuse MMKV instance
import { FinanceEngine } from '../services/finance-engine';

export interface Transaction {
    id: string;
    amount: number;
    category: string;
    description: string;
    date: string; // ISO string
}

interface TransactionState {
    currentBalance: number;
    transactions: Transaction[];

    // Computed (simplified for MVP)
    safeSpendToday: number;
    daysToPayday: number;

    // Sync metadata
    lastSyncedAt: string | null;

    // Actions
    setBalance: (amount: number) => void;
    addTransaction: (amount: number, description: string, category?: string) => void;
    setTransactions: (transactions: Transaction[]) => void;
    updateSafeSpend: (safeSpend: number, days: number) => void;
    recalculateSafeSpend: () => void;
    resetTransactions: () => void;
    setLastSynced: (date: string) => void;

    // Computed helpers
    getSpentToday: () => number;
    getSpentThisMonth: () => number;
    getTransactionsByCategory: () => Record<string, number>;
}

export const useTransactionStore = create<TransactionState>()(
    persist(
        (set, get) => ({
            currentBalance: 0,
            transactions: [],
            safeSpendToday: 0,
            daysToPayday: 0,
            lastSyncedAt: null,

            setBalance: (amount) => set({ currentBalance: amount }),

            addTransaction: (amount, description, category = 'Uncategorized') =>
                set((state) => ({
                    transactions: [
                        {
                            id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                            amount,
                            description,
                            category,
                            date: new Date().toISOString()
                        },
                        ...state.transactions
                    ],
                    currentBalance: state.currentBalance - amount,
                })),

            setTransactions: (transactions) => set({ transactions }),

            updateSafeSpend: (safeSpend, days) => set({ safeSpendToday: safeSpend, daysToPayday: days }),

            recalculateSafeSpend: () => {
                const state = get();
                const userState = useUserStore.getState();

                if (!userState.payday) return;

                const days = FinanceEngine.calculateDaysToPayday(userState.payday);
                const totalFixed = userState.fixedExpenses.reduce((sum, item) => sum + item.amount, 0);
                const safeSpend = FinanceEngine.calculateSafeSpend(state.currentBalance, totalFixed, days);

                set({ safeSpendToday: safeSpend, daysToPayday: days });
            },

            resetTransactions: () => set({
                currentBalance: 0,
                transactions: [],
                safeSpendToday: 0,
                daysToPayday: 0,
                lastSyncedAt: null
            }),

            setLastSynced: (date) => set({ lastSyncedAt: date }),

            // Computed helpers for pattern analysis
            getSpentToday: () => {
                const today = new Date().toISOString().split('T')[0];
                return get().transactions
                    .filter(t => t.date.startsWith(today))
                    .reduce((sum, t) => sum + t.amount, 0);
            },

            getSpentThisMonth: () => {
                const now = new Date();
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                return get().transactions
                    .filter(t => new Date(t.date) >= monthStart)
                    .reduce((sum, t) => sum + t.amount, 0);
            },

            getTransactionsByCategory: () => {
                const transactions = get().transactions;
                const byCategory: Record<string, number> = {};

                for (const t of transactions) {
                    const cat = t.category || 'Uncategorized';
                    byCategory[cat] = (byCategory[cat] || 0) + t.amount;
                }

                return byCategory;
            },
        }),
        {
            name: 'transaction-storage',
            storage: createJSONStorage(() => mmkvStorage),
        }
    )
);
