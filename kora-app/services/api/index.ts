/**
 * API Services Index
 *
 * Central export for all API services.
 */

export { default as apiClient, TokenStorage, getErrorMessage } from './client';
export type { ApiResponse } from './client';

export { AuthAPI } from './auth';
export type { AuthUser, SignupResponse, LoginResponse, MeResponse } from './auth';

export { AIAPI } from './ai';
export type {
  AIResponse,
  TranscriptionResponse,
  ChatResponse,
  OnboardingResponse,
  VoiceResponse,
} from './ai';

export { UsersAPI } from './users';
export type {
  UserProfile,
  FixedExpense,
  UpdateProfileData,
  CreateExpenseData,
} from './users';

export { TransactionsAPI } from './transactions';
export type {
  Transaction,
  TransactionStats,
  CreateTransactionData,
  TransactionQueryParams,
} from './transactions';
