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

    // Actions
    setBalance: (amount: number) => void;
    addTransaction: (amount: number, description: string, category?: string) => void;
    updateSafeSpend: (safeSpend: number, days: number) => void; // Manually update for now or via AI
    recalculateSafeSpend: () => void;
    resetTransactions: () => void;
}

export const useTransactionStore = create<TransactionState>()(
    persist(
        (set, get) => ({
            currentBalance: 0,
            transactions: [],
            safeSpendToday: 0,
            daysToPayday: 0,

            setBalance: (amount) => set({ currentBalance: amount }),

            addTransaction: (amount, description, category = 'Uncategorized') =>
                set((state) => ({
                    transactions: [
                        {
                            id: Math.random().toString(),
                            amount,
                            description,
                            category,
                            date: new Date().toISOString()
                        },
                        ...state.transactions
                    ],
                    currentBalance: state.currentBalance - amount,
                })),

            updateSafeSpend: (safeSpend, days) => set({ safeSpendToday: safeSpend, daysToPayday: days }),

            recalculateSafeSpend: () => {
                const state = get();
                const userState = useUserStore.getState();

                if (!userState.payday) return;

                const days = FinanceEngine.calculateDaysToPayday(userState.payday);
                // Sum fixed expenses
                const totalFixed = userState.fixedExpenses.reduce((sum, item) => sum + item.amount, 0);

                const safeSpend = FinanceEngine.calculateSafeSpend(state.currentBalance, totalFixed, days);

                set({ safeSpendToday: safeSpend, daysToPayday: days });
            },

            resetTransactions: () => set({ currentBalance: 0, transactions: [], safeSpendToday: 0, daysToPayday: 0 })
        }),
        {
            name: 'transaction-storage',
            storage: createJSONStorage(() => mmkvStorage),
        }
    )
);
