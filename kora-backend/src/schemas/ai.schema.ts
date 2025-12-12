import { z } from 'zod';

export const onboardingStepSchema = z.enum([
  'WELCOME',
  'INCOME',
  'EXPENSES',
  'BALANCE_PAYDAY',
  'ANALYSIS',
  'BANK_PROMPT',
]);

export const intentSchema = z.enum([
  'SPEND_DECISION',
  'SAFE_SPEND_CHECK',
  'EMOTIONAL',
  'POST_SPEND',
  'GENERAL',
]);

export const currencySchema = z.enum(['NGN', 'GBP']);

export const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  context: z
    .object({
      safeSpendToday: z.number().optional(),
      daysToPayday: z.number().optional(),
      spentToday: z.number().optional(),
    })
    .optional(),
});

export const onboardingRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  step: onboardingStepSchema,
  currency: currencySchema.optional(),
  collectedData: z.record(z.string(), z.any()).optional(),
});

export const ttsRequestSchema = z.object({
  text: z.string().min(1).max(5000),
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
export type OnboardingRequestInput = z.infer<typeof onboardingRequestSchema>;
export type TtsRequestInput = z.infer<typeof ttsRequestSchema>;
