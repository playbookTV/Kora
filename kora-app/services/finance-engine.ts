
/**
 * Core Financial Logic for Kora
 */

export const FinanceEngine = {
    /**
     * Calculate days remaining until the next payday.
     * @param paydayDay The day of the month (1-31).
     * @returns number of days from today.
     */
    calculateDaysToPayday: (paydayDay: number): number => {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth(); // 0-indexed
        const currentDay = today.getDate();

        // Construct payday date for this month
        let targetDate = new Date(currentYear, currentMonth, paydayDay);

        // If today is past this month's payday, user is waiting for NEXT month's payday
        if (currentDay > paydayDay) {
            targetDate = new Date(currentYear, currentMonth + 1, paydayDay);
        }

        // Calculate difference in time
        const diffTime = targetDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays > 0 ? diffDays : 0; // Should be at least 0 (today is payday)
    },

    /**
     * Calculate Safe Spend Today.
     * Formula: (Balance - Remaining Fixed Expenses) / Days to Payday
     * @param balance Current Available Balance
     * @param fixedExpenses Total of monthly fixed expenses
     * @param daysToPayday Number of days until payday
     * @returns Safe Spend Amount
     */
    /**
     * Calculate total amount of bills due between TODAY and PAYDAY
     */
    calculateUpcomingBills: (expenses: { dueDay?: number | null, amount: number }[], paydayDay: number): number => {
        const today = new Date();
        const currentDay = today.getDate();
        let upcomingTotal = 0;

        for (const expense of expenses) {
            if (!expense.dueDay) continue;

            if (currentDay < paydayDay) {
                // Same month window
                if (expense.dueDay > currentDay && expense.dueDay < paydayDay) {
                    upcomingTotal += expense.amount;
                }
            } else {
                // Month wrap window
                if (expense.dueDay > currentDay) {
                    upcomingTotal += expense.amount;
                } else if (expense.dueDay < paydayDay) {
                    upcomingTotal += expense.amount;
                }
            }
        }
        return upcomingTotal;
    },

    /**
     * Calculate Safe Spend Today.
     * Formula: (Current Balance - Upcoming Bills) / Days to Payday
     */
    calculateSafeSpend: (balance: number, fixedExpenses: { dueDay?: number | null, amount: number }[], daysToPayday: number, paydayDay: number): number => {
        if (daysToPayday <= 1) return balance;

        const upcomingBills = FinanceEngine.calculateUpcomingBills(fixedExpenses, paydayDay);
        const effectiveBalance = balance - upcomingBills;

        if (effectiveBalance <= 0) return 0;

        return Math.floor(effectiveBalance / daysToPayday);
    },

    /**
     * Calculate Flexible Remaining.
     * Formula: Income - Total Fixed Expenses - Spent This Month
     */
    calculateFlexibleRemaining: (income: number, totalFixedExpenses: number, spentThisMonth: number): number => {
        return income - totalFixedExpenses - spentThisMonth;
    }
};
