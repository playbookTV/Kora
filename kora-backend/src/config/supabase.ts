import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';
import type { Database } from '../types/database.js';

// Client for user-context operations (respects RLS)
export const supabase: SupabaseClient<Database> = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY
);

// Admin client for service operations (bypasses RLS)
export const supabaseAdmin: SupabaseClient<Database> = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// Create authenticated client for a specific user
export const createAuthenticatedClient = (accessToken: string): SupabaseClient<Database> => {
  return createClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
};
