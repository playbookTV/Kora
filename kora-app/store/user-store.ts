import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

// Initialize MMKV
// Casting to any to resolve TS error: "'MMKV' only refers to a type, but is being used as a value here"
export const storage = new (MMKV as any)();

// MMKV wrapper for Zustand
export const mmkvStorage = {
    setItem: (name: string, value: string) => storage.set(name, value),
    getItem: (name: string) => storage.getString(name) ?? null,
    removeItem: (name: string) => storage.delete(name),
};

export interface FixedExpense {
    id?: string;
    name: string;
    amount: number;
    dueDay?: number | null; // 1-31
}

interface UserState {
    hasOnboarded: boolean;
    name: string | null;
    income: number | null; // Monthly income
    payday: number | null; // Day of month (1-31)
    currentBalance: number | null;
    savingsGoal: number | null;
    fixedExpenses: FixedExpense[];
    currency: 'NGN' | 'GBP';

    // Actions
    completeOnboarding: () => void;
    setHasOnboarded: (value: boolean) => void;
    setName: (name: string) => void;
    setIncome: (amount: number) => void;
    setPayday: (day: number) => void;
    setCurrentBalance: (amount: number) => void;
    setSavingsGoal: (amount: number) => void;
    setCurrency: (currency: 'NGN' | 'GBP') => void;
    addFixedExpense: (name: string, amount: number, dueDay?: number) => void;
    setFixedExpenses: (expenses: FixedExpense[]) => void;
    resetUser: () => void;
}

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            hasOnboarded: false,
            name: null,
            income: null,
            payday: null,
            currentBalance: null,
            savingsGoal: null,
            fixedExpenses: [],
            currency: 'NGN',

            completeOnboarding: () => set({ hasOnboarded: true }),
            setHasOnboarded: (value) => set({ hasOnboarded: value }),
            setName: (name) => set({ name }),
            setIncome: (amount) => set({ income: amount }),
            setPayday: (day) => set({ payday: day }),
            setCurrentBalance: (amount) => set({ currentBalance: amount }),
            setSavingsGoal: (amount) => set({ savingsGoal: amount }),
            setCurrency: (currency) => set({ currency }),
            addFixedExpense: (name, amount, dueDay: number | null = null) =>
                set((state) => ({
                    fixedExpenses: [...state.fixedExpenses, { id: Math.random().toString(), name, amount, dueDay }]
                })),
            setFixedExpenses: (expenses) => set({ fixedExpenses: expenses }),
            resetUser: () => set({
                hasOnboarded: false,
                name: null,
                income: null,
                payday: null,
                currentBalance: null,
                savingsGoal: null,
                fixedExpenses: [],
                currency: 'NGN'
            }),
        }),
        {
            name: 'user-storage',
            storage: createJSONStorage(() => mmkvStorage),
        }
    )
);
