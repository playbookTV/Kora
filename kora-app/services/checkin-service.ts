/**
 * Check-in Service
 *
 * Manages proactive interventions per spec Section 6.
 * Handles weekend warnings, payday check-ins, danger zone alerts, and limit follow-ups.
 */

import * as Notifications from 'expo-notifications';
import { useTransactionStore } from '@/store/transaction-store';
import { useUserStore } from '@/store/user-store';
import { usePatternStore } from '@/store/pattern-store';

export type CheckInType =
  | 'weekend_warning'
  | 'payday_checkin'
  | 'danger_zone'
  | 'limit_followup'
  | 'missed_checkin';

export interface CheckIn {
  id: string;
  type: CheckInType;
  title: string;
  message: string;
  suggestedAction?: string;
  scheduledFor: Date;
  delivered: boolean;
  responded: boolean;
  response?: string;
}

export interface CheckInMessage {
  type: CheckInType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Check-in Service - manages proactive interventions
 */
export const CheckInService = {
  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  },

  /**
   * Generate weekend warning check-in
   * Per spec: "Quick pause. It's Friday night—this is usually a risky window for you."
   */
  generateWeekendWarning(): CheckInMessage | null {
    const transactionStore = useTransactionStore.getState();
    const patternStore = usePatternStore.getState();
    const userStore = useUserStore.getState();

    const { safeSpendToday, daysToPayday } = transactionStore;
    const { pattern } = patternStore;
    const currencySymbol = userStore.currency === 'NGN' ? '₦' : '£';

    // Only generate if weekend is a high-risk period
    if (!pattern.overspendTriggers.includes('weekend_spending') && !pattern.highRiskDays.includes('Friday')) {
      return null;
    }

    // Calculate weekend safe spend (Fri-Sun)
    const weekendDays = Math.min(3, daysToPayday);
    const weekendSafeSpend = safeSpendToday * weekendDays;

    return {
      type: 'weekend_warning',
      title: 'Weekend Check-in',
      body: `Quick pause. It's Friday—your usual risky window. Safe spend for the weekend is ${currencySymbol}${weekendSafeSpend.toLocaleString()}. Want to set that as your limit?`,
      data: {
        suggestedLimit: weekendSafeSpend,
        daysToPayday,
      },
    };
  },

  /**
   * Generate payday check-in
   * Per spec: "Payday hit. Before you do anything, let's look at the month ahead."
   */
  generatePaydayCheckin(): CheckInMessage {
    const userStore = useUserStore.getState();
    const currencySymbol = userStore.currency === 'NGN' ? '₦' : '£';
    const { income, fixedExpenses } = userStore;

    const totalFixed = fixedExpenses.reduce((sum, e) => sum + e.amount, 0);
    const flexibleIncome = (income || 0) - totalFixed;

    return {
      type: 'payday_checkin',
      title: 'Payday!',
      body: `Payday hit. After fixed expenses, you've got ${currencySymbol}${flexibleIncome.toLocaleString()} flexible this month. Want to protect some of it now?`,
      data: {
        flexibleIncome,
        income,
        fixedExpenses: totalFixed,
      },
    };
  },

  /**
   * Generate danger zone alert
   * Per spec: "Heads up. You've got ₦12k for 5 days. That's tight."
   */
  generateDangerZoneAlert(): CheckInMessage | null {
    const transactionStore = useTransactionStore.getState();
    const userStore = useUserStore.getState();

    const { safeSpendToday, daysToPayday, currentBalance } = transactionStore;
    const currencySymbol = userStore.currency === 'NGN' ? '₦' : '£';

    // Only alert if genuinely tight
    if (daysToPayday > 7 || safeSpendToday > 10000) {
      return null;
    }

    return {
      type: 'danger_zone',
      title: 'Heads Up',
      body: `You've got ${currencySymbol}${currentBalance.toLocaleString()} for ${daysToPayday} days. That's ${currencySymbol}${safeSpendToday.toLocaleString()} daily. One unplanned expense could tip you. Stay sharp today.`,
      data: {
        balance: currentBalance,
        daysToPayday,
        safeSpendToday,
      },
    };
  },

  /**
   * Generate limit follow-up
   * Per spec: "It's Sunday night. You set a ₦20k weekend limit. How'd it go?"
   */
  generateLimitFollowup(limitAmount: number, actualSpent: number): CheckInMessage {
    const userStore = useUserStore.getState();
    const currencySymbol = userStore.currency === 'NGN' ? '₦' : '£';

    const overUnder = actualSpent - limitAmount;
    const wasUnder = overUnder <= 0;

    return {
      type: 'limit_followup',
      title: 'Limit Check-in',
      body: wasUnder
        ? `You set a ${currencySymbol}${limitAmount.toLocaleString()} limit and spent ${currencySymbol}${actualSpent.toLocaleString()}. Nice work staying under!`
        : `You set a ${currencySymbol}${limitAmount.toLocaleString()} limit but spent ${currencySymbol}${actualSpent.toLocaleString()}. That's ${currencySymbol}${overUnder.toLocaleString()} over. No judgment—let's recalibrate.`,
      data: {
        limitAmount,
        actualSpent,
        overUnder,
        wasUnder,
      },
    };
  },

  /**
   * Schedule a notification
   */
  async scheduleNotification(
    message: CheckInMessage,
    triggerDate: Date
  ): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: message.title,
          body: message.body,
          data: { type: message.type, ...message.data },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });

      return identifier;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
    }
  },

  /**
   * Schedule weekend warning (Friday 5-6 PM)
   */
  async scheduleWeekendWarning(): Promise<string | null> {
    const message = this.generateWeekendWarning();
    if (!message) return null;

    // Find next Friday at 5 PM
    const now = new Date();
    const friday = new Date(now);
    friday.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7));
    friday.setHours(17, 0, 0, 0);

    // If it's already past Friday 5 PM this week, schedule for next Friday
    if (friday <= now) {
      friday.setDate(friday.getDate() + 7);
    }

    return this.scheduleNotification(message, friday);
  },

  /**
   * Schedule payday check-in
   */
  async schedulePaydayCheckin(): Promise<string | null> {
    const userStore = useUserStore.getState();
    const { payday } = userStore;

    if (!payday) return null;

    const message = this.generatePaydayCheckin();

    // Find next payday at 10 AM
    const now = new Date();
    const nextPayday = new Date(now);
    nextPayday.setDate(payday);
    nextPayday.setHours(10, 0, 0, 0);

    // If payday has passed this month, schedule for next month
    if (nextPayday <= now) {
      nextPayday.setMonth(nextPayday.getMonth() + 1);
    }

    return this.scheduleNotification(message, nextPayday);
  },

  /**
   * Check if we should show a proactive message now
   */
  shouldShowProactiveMessage(): CheckInMessage | null {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();

    // Friday evening (5-8 PM) - weekend warning
    if (dayOfWeek === 5 && hour >= 17 && hour < 20) {
      return this.generateWeekendWarning();
    }

    // Danger zone check (any time)
    const dangerAlert = this.generateDangerZoneAlert();
    if (dangerAlert) {
      return dangerAlert;
    }

    // Payday check (if today is payday and morning)
    const userStore = useUserStore.getState();
    if (now.getDate() === userStore.payday && hour >= 8 && hour < 12) {
      return this.generatePaydayCheckin();
    }

    return null;
  },

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllScheduled(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  /**
   * Get all pending notifications
   */
  async getPendingNotifications(): Promise<Notifications.NotificationRequest[]> {
    return Notifications.getAllScheduledNotificationsAsync();
  },
};

export default CheckInService;
