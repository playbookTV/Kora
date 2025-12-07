import { z } from 'zod';

export const createTransactionSchema = z.object({
  amount: z.number().positive(),
  category: z.string().min(1).max(50).default('Uncategorized'),
  description: z.string().min(1).max(500),
  date: z.string().datetime().optional(),
});

export const transactionQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type TransactionQueryInput = z.infer<typeof transactionQuerySchema>;
