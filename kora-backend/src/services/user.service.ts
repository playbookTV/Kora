import { createAuthenticatedClient, supabaseAdmin } from '../config/supabase.js';
import type { UpdateProfileInput, CreateFixedExpenseInput, UpdateFixedExpenseInput } from '../schemas/user.schema.js';
import type { UserProfile, FixedExpense } from '../types/index.js';

export class UserService {
  // Profile operations
  static async getProfile(userId: string, accessToken: string): Promise<UserProfile> {
    const supabase = createAuthenticatedClient(accessToken);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new Error('Profile not found');
    }

    return data as UserProfile;
  }

  static async updateProfile(
    userId: string,
    accessToken: string,
    input: UpdateProfileInput
  ): Promise<UserProfile> {
    const supabase = createAuthenticatedClient(accessToken);

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to update profile');
    }

    return data as UserProfile;
  }

  static async completeOnboarding(userId: string, accessToken: string): Promise<UserProfile> {
    const supabase = createAuthenticatedClient(accessToken);

    const { data, error } = await supabase
      .from('profiles')
      .update({
        has_onboarded: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to complete onboarding');
    }

    return data as UserProfile;
  }

  static async deleteAccount(userId: string): Promise<void> {
    // Delete profile (cascade will handle related tables)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      throw new Error('Failed to delete profile');
    }

    // Delete auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      throw new Error('Failed to delete auth user');
    }
  }

  // Fixed expenses operations
  static async getFixedExpenses(userId: string, accessToken: string): Promise<FixedExpense[]> {
    const supabase = createAuthenticatedClient(accessToken);

    const { data, error } = await supabase
      .from('fixed_expenses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch fixed expenses');
    }

    return data as FixedExpense[];
  }

  static async createFixedExpense(
    userId: string,
    accessToken: string,
    input: CreateFixedExpenseInput
  ): Promise<FixedExpense> {
    const supabase = createAuthenticatedClient(accessToken);

    const { data, error } = await supabase
      .from('fixed_expenses')
      .insert({
        user_id: userId,
        name: input.name,
        amount: input.amount,
        due_day: input.due_day,
      })
      .select()
      .single();

    if (error) {
      throw new Error('Failed to create fixed expense');
    }

    return data as FixedExpense;
  }

  static async updateFixedExpense(
    userId: string,
    expenseId: string,
    accessToken: string,
    input: UpdateFixedExpenseInput
  ): Promise<FixedExpense> {
    const supabase = createAuthenticatedClient(accessToken);

    const { data, error } = await supabase
      .from('fixed_expenses')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', expenseId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to update fixed expense');
    }

    return data as FixedExpense;
  }

  static async deleteFixedExpense(
    userId: string,
    expenseId: string,
    accessToken: string
  ): Promise<void> {
    const supabase = createAuthenticatedClient(accessToken);

    const { error } = await supabase
      .from('fixed_expenses')
      .delete()
      .eq('id', expenseId)
      .eq('user_id', userId);

    if (error) {
      throw new Error('Failed to delete fixed expense');
    }
  }
}
