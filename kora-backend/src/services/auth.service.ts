import { supabaseAdmin } from '../config/supabase.js';
import type { SignupInput, LoginInput } from '../schemas/auth.schema.js';

export class AuthService {
  static async signup(input: SignupInput) {
    const { email, password, name } = input;

    // Create auth user (profile is auto-created by database trigger)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for now
    });

    if (authError) {
      throw new Error(authError.message);
    }

    // Update profile with name if provided (trigger creates basic profile)
    if (name) {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ name })
        .eq('id', authData.user.id);

      if (updateError) {
        console.warn('Failed to update profile name:', updateError.message);
      }
    }

    // Sign in to get tokens
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (sessionError) {
      throw new Error('Account created but failed to sign in');
    }

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email!,
      },
      session: {
        access_token: sessionData.session!.access_token,
        refresh_token: sessionData.session!.refresh_token,
        expires_at: sessionData.session!.expires_at,
      },
    };
  }

  static async login(input: LoginInput) {
    const { email, password } = input;

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error('Invalid email or password');
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email!,
      },
      session: {
        access_token: data.session!.access_token,
        refresh_token: data.session!.refresh_token,
        expires_at: data.session!.expires_at,
      },
    };
  }

  static async logout(accessToken: string) {
    const { error } = await supabaseAdmin.auth.admin.signOut(accessToken);

    if (error) {
      // Log but don't throw - logout should be idempotent
      console.warn('Logout warning:', error.message);
    }

    return { success: true };
  }

  static async refreshToken(refreshToken: string) {
    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      throw new Error('Invalid or expired refresh token');
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    };
  }

  static async getUser(userId: string) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (error || !data.user) {
      throw new Error('User not found');
    }

    return {
      id: data.user.id,
      email: data.user.email!,
      created_at: data.user.created_at,
    };
  }
}
