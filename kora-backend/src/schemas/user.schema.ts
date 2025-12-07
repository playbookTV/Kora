import { z } from 'zod';

export const currencySchema = z.enum(['NGN', 'GBP']);

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  income: z.number().positive().optional(),
  payday: z.number().int().min(1).max(31).optional(),
  current_balance: z.number().optional(),
  savings_goal: z.number().positive().optional(),
  currency: currencySchema.optional(),
});

export const createFixedExpenseSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().positive(),
  due_day: z.number().int().min(1).max(31).optional().nullable(),
});

export const updateFixedExpenseSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  amount: z.number().positive().optional(),
  due_day: z.number().int().min(1).max(31).optional().nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateFixedExpenseInput = z.infer<typeof createFixedExpenseSchema>;
export type UpdateFixedExpenseInput = z.infer<typeof updateFixedExpenseSchema>;
