import { UserService } from './user.service.js';
import { TransactionService } from './transaction.service.js';
import type { UserProfile, FixedExpense } from '../types/index.js';

export interface FinancialState {
  profile: UserProfile;
  totalFixedExpenses: number;
  flexibleIncome: number;
  daysToPayday: number;
  safeSpendToday: number;
  spentToday: number;
  flexibleRemaining: number;
  upcomingBillsAmount: number; // New field for accuracy
}

export class FinanceService {
  /**
   * Calculate the complete financial state for a user.
   * Centralizes logic for Safe Spend, Payday countdown, and Flexible Remaining.
   */
  static async calculateFinanceState(userId: string, accessToken: string): Promise<FinancialState> {
    const profile = await UserService.getProfile(userId, accessToken);
    const expenses = await UserService.getFixedExpenses(userId, accessToken);
    const stats = await TransactionService.getStats(userId, accessToken); // This still needs optimization later

    const totalFixedExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const flexibleIncome = (profile.income || 0) - totalFixedExpenses;

    // 1. Calculate Days to Payday
    const daysToPayday = this.calculateDaysToPayday(profile.payday || 1);

    // 2. Calculate Upcoming Bills (Due between now and payday)
    // This fixes the "Safe Spend Bug" where we ignored bills due tomorrow
    const upcomingBillsAmount = this.calculateUpcomingBills(expenses, profile.payday || 1);

    // 3. Calculate Safe Spend
    // Formula: (Current Balance - Upcoming Bills) / Days
    const availableNow = profile.current_balance || 0;
    const effectiveBalance = availableNow - upcomingBillsAmount;
    
    // Ensure we don't divide by zero or negative days
    // If days=0 (payday), safe spend is the whole balance? Or just what's left? 
    // Usually if days=0, it means payday is tomorrow or today. Let's assume minimum 1 divisor.
    const divisor = daysToPayday < 1 ? 1 : daysToPayday;
    
    let safeSpendToday = Math.floor(effectiveBalance / divisor);
    if (safeSpendToday < 0) safeSpendToday = 0;

    return {
      profile,
      totalFixedExpenses,
      flexibleIncome,
      daysToPayday,
      safeSpendToday,
      spentToday: stats.spentToday,
      flexibleRemaining: flexibleIncome - stats.totalSpent,
      upcomingBillsAmount,
    };
  }

  /**
   * Helper: Calculate days remaining until next payday
   */
  static calculateDaysToPayday(paydayDay: number): number {
    const today = new Date();
    const currentDay = today.getDate();
    
    if (currentDay < paydayDay) {
      // Payday is later this month
      return paydayDay - currentDay;
    } else {
      // Payday is next month
      // Handle edge cases like "Next month doesn't have day 31"
      // Basic logic: Get date of next month's payday
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      // If paydayDay is 31 and next month is Feb (28), set to 28?
      // For MVP we accept JS Date auto-correction (Jan 31 + 1 month -> Mar 3 sometimes)
      // Better approach: Set to 'paydayDay', check if month jumped 2 steps
      
      const targetDate = new Date(today.getFullYear(), today.getMonth() + 1, paydayDay);
      
      // Check if we skipped a month (e.g. Jan 31 -> Mar 3)
      if (targetDate.getMonth() !== (today.getMonth() + 1) % 12) {
         // Set to last day of the intended month
         targetDate.setDate(0); 
      }

      const diffTime = targetDate.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }

  /**
   * Helper: Calculate total amount of bills due between TODAY and PAYDAY
   */
  static calculateUpcomingBills(expenses: FixedExpense[], paydayDay: number): number {
    const today = new Date();
    const currentDay = today.getDate();
    
    // If we passed payday, we are looking at next month's payday
    // This logic needs to align with calculateDaysToPayday
    
    // Scenario 1: Today is 5th, Payday is 25th.
    // We care about bills due on 6th...24th.
    
    // Scenario 2: Today is 26th, Payday is 25th (Next Month).
    // We care about bills due on 27th...31st AND 1st...24th.
    
    let upcomingTotal = 0;

    for (const expense of expenses) {
      if (!expense.due_day) continue;

      if (currentDay < paydayDay) {
        // Same month window
        if (expense.due_day > currentDay && expense.due_day < paydayDay) {
          upcomingTotal += expense.amount;
        }
      } else {
        // Month wrap window
        // Due later this month OR due early next month before payday
        if (expense.due_day > currentDay) {
          // Later this month
          upcomingTotal += expense.amount;
        } else if (expense.due_day < paydayDay) {
          // Early next month
          upcomingTotal += expense.amount;
        }
      }
    }

    return upcomingTotal;
  }
}
