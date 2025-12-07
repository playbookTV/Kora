import type { FastifyRequest, FastifyReply } from 'fastify';

// User types
export interface UserProfile {
  id: string;
  name: string | null;
  income: number | null;
  payday: number | null;
  current_balance: number | null;
  savings_goal: number | null;
  currency: 'NGN' | 'GBP';
  has_onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface FixedExpense {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_day: number | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  created_at: string;
}

export interface ConversationHistory {
  id: string;
  user_id: string;
  user_message: string;
  ai_response: string;
  intent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// Auth types
export interface AuthUser {
  id: string;
  email: string;
  aud: string;
  role: string;
}

export interface AuthenticatedRequest extends FastifyRequest {
  user: AuthUser;
  accessToken: string;
}

// AI types
export type OnboardingStep = 'WELCOME' | 'INCOME' | 'EXPENSES' | 'BALANCE_PAYDAY' | 'ANALYSIS' | 'BANK_PROMPT';
export type ConversationIntent = 'SPEND_DECISION' | 'SAFE_SPEND_CHECK' | 'EMOTIONAL' | 'POST_SPEND' | 'GENERAL';
export type Currency = 'NGN' | 'GBP';

export interface AIResponse {
  text: string;
  action?: string;
  data?: Record<string, unknown>;
  nextStep?: string;
  shouldAdvance?: boolean;
}

export interface OnboardingContext {
  step: OnboardingStep;
  currency: Currency;
  collectedData: {
    income?: { amount: number; frequency: string; payday?: number };
    expenses?: Array<{ name: string; amount: number; due_day?: number }>;
    balance?: number;
    savingsGoal?: number;
    payday?: number;
  };
  userMessage?: string;
}

export interface ConversationContext {
  intent: ConversationIntent;
  currency: Currency;
  userProfile: {
    name?: string;
    income: number;
    payday: number;
    fixedExpenses: number;
    currentBalance: number;
    savingsGoal?: number;
  };
  financialState: {
    safeSpendToday: number;
    daysToPayday: number;
    spentToday: number;
    upcomingBills: number;
    flexibleRemaining: number;
  };
  patterns?: {
    avgDailySpend: number;
    highRiskDays: string[];
    topCategories: Array<{ name: string; avgMonthly: number }>;
    riskScore: number;
  };
  userMessage: string;
  detectedEmotion?: string;
  extractedAmount?: number;
  extractedItem?: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
