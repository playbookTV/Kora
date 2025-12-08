/**
 * Pattern Store
 *
 * Stores and manages spending pattern analysis for risk detection
 * and proactive interventions per spec Section 6.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from './user-store';
import { useTransactionStore } from './transaction-store';

export interface SpendingPattern {
  avgDailySpend: number;
  avgWeekendSpend: number;
  avgWeekdaySpend: number;
  highRiskDays: string[]; // e.g., ['Friday', 'Saturday']
  highRiskTimes: string[]; // e.g., ['evening', 'night']
  topCategories: {
    category: string;
    avgMonthly: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  overspendTriggers: string[];
  currentStreak: number; // Days under safe spend
  riskScore: number; // 0-100
  lastAnalyzedAt: string | null;
}

interface PatternState {
  pattern: SpendingPattern;

  // Actions
  analyzePatterns: () => void;
  updateStreak: (underSafeSpend: boolean) => void;
  calculateRiskScore: () => number;
  getHighRiskAlert: () => { isHighRisk: boolean; reason: string } | null;
  resetPatterns: () => void;
}

const DEFAULT_PATTERN: SpendingPattern = {
  avgDailySpend: 0,
  avgWeekendSpend: 0,
  avgWeekdaySpend: 0,
  highRiskDays: [],
  highRiskTimes: [],
  topCategories: [],
  overspendTriggers: [],
  currentStreak: 0,
  riskScore: 50,
  lastAnalyzedAt: null,
};

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const usePatternStore = create<PatternState>()(
  persist(
    (set, get) => ({
      pattern: DEFAULT_PATTERN,

      /**
       * Analyze transaction history to detect patterns
       * Per spec: "What Kora Can Do at Each Level" - patterns need 30+ days of data
       */
      analyzePatterns: () => {
        const transactions = useTransactionStore.getState().transactions;

        if (transactions.length < 7) {
          // Not enough data for meaningful patterns
          return;
        }

        // Group transactions by day of week
        const byDayOfWeek: Record<string, number[]> = {};
        DAYS_OF_WEEK.forEach((d) => (byDayOfWeek[d] = []));

        // Group by category
        const byCategory: Record<string, number> = {};

        // Calculate daily totals
        const dailyTotals: Record<string, number> = {};

        for (const t of transactions) {
          const date = new Date(t.date);
          const dayName = DAYS_OF_WEEK[date.getDay()];
          const dateKey = t.date.split('T')[0];

          // By day of week
          byDayOfWeek[dayName].push(t.amount);

          // By category
          const cat = t.category || 'Uncategorized';
          byCategory[cat] = (byCategory[cat] || 0) + t.amount;

          // Daily totals
          dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + t.amount;
        }

        // Calculate averages
        const avgByDay: Record<string, number> = {};
        for (const [day, amounts] of Object.entries(byDayOfWeek)) {
          avgByDay[day] = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
        }

        // Identify high-risk days (above average)
        const overallDayAvg = Object.values(avgByDay).reduce((a, b) => a + b, 0) / 7;
        const highRiskDays = Object.entries(avgByDay)
          .filter(([, avg]) => avg > overallDayAvg * 1.3) // 30% above average
          .map(([day]) => day);

        // Weekend vs weekday spending
        const weekendDays = ['Friday', 'Saturday', 'Sunday'];
        const weekendSpends = weekendDays.flatMap((d) => byDayOfWeek[d]);
        const weekdaySpends = DAYS_OF_WEEK.filter((d) => !weekendDays.includes(d)).flatMap((d) => byDayOfWeek[d]);

        const avgWeekendSpend = weekendSpends.length > 0
          ? weekendSpends.reduce((a, b) => a + b, 0) / weekendSpends.length
          : 0;
        const avgWeekdaySpend = weekdaySpends.length > 0
          ? weekdaySpends.reduce((a, b) => a + b, 0) / weekdaySpends.length
          : 0;

        // Calculate overall daily average
        const dailyValues = Object.values(dailyTotals);
        const avgDailySpend = dailyValues.length > 0
          ? dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length
          : 0;

        // Top categories (sorted by spend)
        const topCategories = Object.entries(byCategory)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([category, total]) => ({
            category,
            avgMonthly: total,
            trend: 'stable' as const, // Would need historical comparison for real trend
          }));

        // Detect overspend triggers
        const overspendTriggers: string[] = [];
        if (avgWeekendSpend > avgWeekdaySpend * 1.5) {
          overspendTriggers.push('weekend_spending');
        }
        if (highRiskDays.includes('Friday')) {
          overspendTriggers.push('friday_evening');
        }

        // Calculate risk score
        const riskScore = get().calculateRiskScore();

        set({
          pattern: {
            ...get().pattern,
            avgDailySpend,
            avgWeekendSpend,
            avgWeekdaySpend,
            highRiskDays,
            highRiskTimes: avgWeekendSpend > avgWeekdaySpend * 1.5 ? ['evening'] : [],
            topCategories,
            overspendTriggers,
            riskScore,
            lastAnalyzedAt: new Date().toISOString(),
          },
        });
      },

      /**
       * Update spending streak
       */
      updateStreak: (underSafeSpend: boolean) => {
        set((state) => ({
          pattern: {
            ...state.pattern,
            currentStreak: underSafeSpend ? state.pattern.currentStreak + 1 : 0,
          },
        }));
      },

      /**
       * Calculate risk score (0-100)
       * Higher = more risky
       */
      calculateRiskScore: () => {
        const transactionStore = useTransactionStore.getState();
        const { safeSpendToday, daysToPayday, currentBalance } = transactionStore;
        const pattern = get().pattern;

        let score = 50; // Base score

        // Factor 1: Days to payday (more days = lower risk)
        if (daysToPayday <= 3) score += 20;
        else if (daysToPayday <= 7) score += 10;
        else if (daysToPayday > 14) score -= 10;

        // Factor 2: Safe spend buffer
        if (safeSpendToday < 1000) score += 25;
        else if (safeSpendToday < 5000) score += 10;
        else if (safeSpendToday > 20000) score -= 15;

        // Factor 3: Current day of week
        const today = DAYS_OF_WEEK[new Date().getDay()];
        if (pattern.highRiskDays.includes(today)) score += 15;

        // Factor 4: Balance ratio
        const spentThisMonth = transactionStore.getSpentThisMonth();
        if (currentBalance > 0 && spentThisMonth > currentBalance * 0.8) {
          score += 20;
        }

        // Factor 5: Streak (longer streak = lower risk)
        if (pattern.currentStreak >= 7) score -= 15;
        else if (pattern.currentStreak >= 3) score -= 5;

        // Clamp to 0-100
        return Math.max(0, Math.min(100, score));
      },

      /**
       * Get high risk alert if conditions are met
       * Per spec Section 6: Proactive Interventions
       */
      getHighRiskAlert: () => {
        const transactionStore = useTransactionStore.getState();
        const { daysToPayday, safeSpendToday } = transactionStore;
        const pattern = get().pattern;
        const today = DAYS_OF_WEEK[new Date().getDay()];
        const hour = new Date().getHours();

        // Friday evening warning
        if (today === 'Friday' && hour >= 17 && pattern.overspendTriggers.includes('weekend_spending')) {
          return {
            isHighRisk: true,
            reason: 'weekend_warning',
          };
        }

        // Approaching danger zone
        if (daysToPayday <= 5 && safeSpendToday < 5000) {
          return {
            isHighRisk: true,
            reason: 'danger_zone',
          };
        }

        // Historical high-risk day
        if (pattern.highRiskDays.includes(today) && pattern.riskScore > 70) {
          return {
            isHighRisk: true,
            reason: 'high_risk_day',
          };
        }

        return null;
      },

      resetPatterns: () => set({ pattern: DEFAULT_PATTERN }),
    }),
    {
      name: 'pattern-storage',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

export default usePatternStore;
