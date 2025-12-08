/**
 * Insights Store
 *
 * Stores and manages monthly insights data per spec Section 16.
 * Provides AI-generated observations and spending breakdowns.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage , useUserStore } from './user-store';
import { useTransactionStore } from './transaction-store';
import { usePatternStore } from './pattern-store';

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  color: string;
}

export interface MonthlyInsight {
  id: string;
  month: string; // YYYY-MM format
  totalSpent: number;
  avgDailySpend: number;
  topCategory: string;
  categoryBreakdown: CategoryBreakdown[];
  aiObservations: string[];
  riskScore: number;
  savingsRate: number;
  generatedAt: string;
}

interface InsightsState {
  currentInsight: MonthlyInsight | null;
  historicalInsights: MonthlyInsight[];
  isGenerating: boolean;

  // Actions
  generateMonthlyInsight: () => void;
  getInsightForMonth: (month: string) => MonthlyInsight | null;
  clearInsights: () => void;
}

// Category colors for chart
const CATEGORY_COLORS = [
  '#1E1E1E', // Primary
  '#4CAF50', // Success
  '#FFC107', // Warning
  '#F44336', // Error
  '#5A5A5A', // Secondary
  '#9E9E9E', // Muted
  '#2196F3', // Blue
  '#9C27B0', // Purple
  '#FF9800', // Orange
  '#00BCD4', // Cyan
];

export const useInsightsStore = create<InsightsState>()(
  persist(
    (set, get) => ({
      currentInsight: null,
      historicalInsights: [],
      isGenerating: false,

      /**
       * Generate insights for the current month
       */
      generateMonthlyInsight: () => {
        set({ isGenerating: true });

        const transactionStore = useTransactionStore.getState();
        const patternStore = usePatternStore.getState();
        const userStore = useUserStore.getState();
        const { transactions } = transactionStore;
        const { pattern } = patternStore;

        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currencySymbol = userStore.currency === 'NGN' ? '₦' : '£';

        // Filter transactions for current month
        const monthTransactions = transactions.filter(
          (t) => new Date(t.date) >= monthStart
        );

        // Calculate total spent
        const totalSpent = monthTransactions.reduce((sum, t) => sum + t.amount, 0);

        // Calculate days elapsed in month
        const daysElapsed = Math.max(1, now.getDate());
        const avgDailySpend = totalSpent / daysElapsed;

        // Group by category
        const byCategory: Record<string, number> = {};
        for (const t of monthTransactions) {
          const cat = t.category || 'Uncategorized';
          byCategory[cat] = (byCategory[cat] || 0) + t.amount;
        }

        // Create category breakdown with percentages
        const categoryBreakdown: CategoryBreakdown[] = Object.entries(byCategory)
          .sort(([, a], [, b]) => b - a)
          .map(([category, amount], index) => ({
            category,
            amount,
            percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
            trend: 'stable' as const, // Would need historical data for real trend
            color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
          }));

        // Get top category
        const topCategory = categoryBreakdown.length > 0
          ? categoryBreakdown[0].category
          : 'None';

        // Calculate savings rate
        const income = userStore.income || 0;
        const savingsRate = income > 0 ? Math.max(0, ((income - totalSpent) / income) * 100) : 0;

        // Generate AI observations based on data
        const aiObservations = generateObservations({
          totalSpent,
          avgDailySpend,
          categoryBreakdown,
          pattern,
          income,
          savingsRate,
          currencySymbol,
          daysElapsed,
        });

        const insight: MonthlyInsight = {
          id: `insight_${currentMonth}`,
          month: currentMonth,
          totalSpent,
          avgDailySpend,
          topCategory,
          categoryBreakdown,
          aiObservations,
          riskScore: pattern.riskScore,
          savingsRate,
          generatedAt: now.toISOString(),
        };

        // Update state
        set((state) => {
          // Remove existing insight for this month if any
          const filtered = state.historicalInsights.filter(
            (i) => i.month !== currentMonth
          );

          return {
            currentInsight: insight,
            historicalInsights: [insight, ...filtered].slice(0, 12), // Keep 12 months
            isGenerating: false,
          };
        });
      },

      getInsightForMonth: (month: string) => {
        const { historicalInsights } = get();
        return historicalInsights.find((i) => i.month === month) || null;
      },

      clearInsights: () =>
        set({
          currentInsight: null,
          historicalInsights: [],
          isGenerating: false,
        }),
    }),
    {
      name: 'insights-storage',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

/**
 * Generate AI-like observations based on spending data
 * Per spec: "AI insights" - what Kora notices
 */
function generateObservations(data: {
  totalSpent: number;
  avgDailySpend: number;
  categoryBreakdown: CategoryBreakdown[];
  pattern: ReturnType<typeof usePatternStore.getState>['pattern'];
  income: number;
  savingsRate: number;
  currencySymbol: string;
  daysElapsed: number;
}): string[] {
  const observations: string[] = [];
  const {
    totalSpent,
    avgDailySpend,
    categoryBreakdown,
    pattern,
    income,
    savingsRate,
    currencySymbol,
    daysElapsed,
  } = data;

  // Observation 1: Top spending category
  if (categoryBreakdown.length > 0) {
    const top = categoryBreakdown[0];
    if (top.percentage > 40) {
      observations.push(
        `${top.category} dominates your spending at ${top.percentage.toFixed(0)}%. Consider if this aligns with your priorities.`
      );
    } else if (categoryBreakdown.length >= 3) {
      observations.push(
        `Your spending is spread across ${categoryBreakdown.length} categories. ${top.category} leads at ${top.percentage.toFixed(0)}%.`
      );
    }
  }

  // Observation 2: Weekend spending pattern
  if (pattern.overspendTriggers.includes('weekend_spending')) {
    observations.push(
      `Weekends are your spending hotspot. Your weekend average is ${(pattern.avgWeekendSpend / pattern.avgWeekdaySpend * 100 - 100).toFixed(0)}% higher than weekdays.`
    );
  }

  // Observation 3: Savings rate
  if (income > 0) {
    if (savingsRate >= 20) {
      observations.push(
        `Strong savings rate of ${savingsRate.toFixed(0)}%. You're on track to save ${currencySymbol}${(income * savingsRate / 100).toLocaleString()} this month.`
      );
    } else if (savingsRate >= 10) {
      observations.push(
        `Your current savings rate is ${savingsRate.toFixed(0)}%. Small wins add up.`
      );
    } else if (savingsRate >= 0) {
      observations.push(
        `Tight month - savings rate at ${savingsRate.toFixed(0)}%. Focus on essential expenses.`
      );
    } else {
      observations.push(
        `You're on track to overspend your income this month. Time to pause and reassess.`
      );
    }
  }

  // Observation 4: Daily average trend
  const projectedMonthly = avgDailySpend * 30;
  if (income > 0 && projectedMonthly > income) {
    observations.push(
      `At ${currencySymbol}${avgDailySpend.toLocaleString()}/day, you'll exceed your income by month-end. Each day matters.`
    );
  }

  // Observation 5: High-risk days
  if (pattern.highRiskDays.length > 0) {
    const riskDays = pattern.highRiskDays.slice(0, 2).join(' and ');
    observations.push(
      `${riskDays} tend to be your high-spend days. Be extra mindful.`
    );
  }

  // Observation 6: Streak recognition
  if (pattern.currentStreak >= 7) {
    observations.push(
      `${pattern.currentStreak}-day streak of staying under safe spend! Keep it going.`
    );
  } else if (pattern.currentStreak >= 3) {
    observations.push(
      `${pattern.currentStreak} days under safe spend. Building momentum.`
    );
  }

  // Observation 7: Risk score
  if (pattern.riskScore > 70) {
    observations.push(
      `Risk score is elevated at ${pattern.riskScore}. Extra caution advised until payday.`
    );
  }

  // Limit to 4 most relevant observations
  return observations.slice(0, 4);
}

export default useInsightsStore;
