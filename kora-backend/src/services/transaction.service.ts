import { createAuthenticatedClient } from '../config/supabase.js';
import type { CreateTransactionInput, TransactionQueryInput } from '../schemas/transaction.schema.js';
import type { Transaction, PaginatedResponse } from '../types/index.js';

export class TransactionService {
  static async getTransactions(
    userId: string,
    accessToken: string,
    query: TransactionQueryInput
  ): Promise<PaginatedResponse<Transaction>> {
    const supabase = createAuthenticatedClient(accessToken);
    const { page, limit, category, startDate, endDate } = query;
    const offset = (page - 1) * limit;

    let queryBuilder = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      queryBuilder = queryBuilder.eq('category', category);
    }

    if (startDate) {
      queryBuilder = queryBuilder.gte('date', startDate);
    }

    if (endDate) {
      queryBuilder = queryBuilder.lte('date', endDate);
    }

    const { data, error, count } = await queryBuilder;

    if (error) {
      throw new Error('Failed to fetch transactions');
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: data as Transaction[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  static async getTransaction(
    userId: string,
    transactionId: string,
    accessToken: string
  ): Promise<Transaction> {
    const supabase = createAuthenticatedClient(accessToken);

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new Error('Transaction not found');
    }

    return data as Transaction;
  }

  static async createTransaction(
    userId: string,
    accessToken: string,
    input: CreateTransactionInput
  ): Promise<Transaction> {
    const supabase = createAuthenticatedClient(accessToken);

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        amount: input.amount,
        category: input.category,
        description: input.description,
        date: input.date || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error('Failed to create transaction');
    }

    return data as Transaction;
  }

  static async deleteTransaction(
    userId: string,
    transactionId: string,
    accessToken: string
  ): Promise<void> {
    const supabase = createAuthenticatedClient(accessToken);

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId)
      .eq('user_id', userId);

    if (error) {
      throw new Error('Failed to delete transaction');
    }
  }

  static async getStats(userId: string, accessToken: string) {
    const supabase = createAuthenticatedClient(accessToken);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString();
    const endDate = new Date().toISOString();

    // Call database function for aggregated stats
    // @ts-ignore - RPC function exists in DB but not in types yet
    const { data: statsData, error } = await (supabase as any)
      .rpc('get_transaction_stats', {
        p_user_id: userId,
        p_start_date: startDate,
        p_end_date: endDate
      });

    const stats = statsData as any;

    if (error) {
      console.error('Stats RPC error:', error);
      // Fallback to manual calculation if RPC fails or isn't deployed yet
      return this.getStatsFallback(userId, accessToken, startDate);
    }

    return {
      totalSpent: stats.total_spent || 0,
      avgDailySpend: Math.round(stats.daily_average || 0),
      transactionCount: stats.transaction_count || 0,
      spentToday: stats.spent_today || 0,
      topCategories: stats.top_categories || [],
      period: {
        start: startDate,
        end: endDate,
      },
    };
  }

  // Fallback method (keeping the old logic just in case)
  private static async getStatsFallback(userId: string, accessToken: string, startDate: string) {
    const supabase = createAuthenticatedClient(accessToken);

    const { data, error } = await supabase
      .from('transactions')
      .select('amount, category, date') // Select only needed fields
      .eq('user_id', userId)
      .gte('date', startDate)
      .order('date', { ascending: false });

    if (error) throw new Error('Failed to fetch transaction stats');

    const transactions = data as Transaction[];
    const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
    const avgDailySpend = totalSpent / 30;
    const transactionCount = transactions.length;

    const categoryTotals = transactions.reduce(
      (acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      },
      {} as Record<string, number>
    );

    const topCategories = Object.entries(categoryTotals)
      .map(([name, total]) => ({ name, total, avgMonthly: total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const today = new Date().toISOString().split('T')[0];
    const spentToday = transactions
      .filter((t) => t.date.startsWith(today))
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalSpent,
      avgDailySpend: Math.round(avgDailySpend),
      transactionCount,
      spentToday,
      topCategories,
      period: {
        start: startDate,
        end: new Date().toISOString(),
      },
    };
  }
}
