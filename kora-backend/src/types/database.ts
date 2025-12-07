// Supabase Database Types
// These should be generated using `supabase gen types typescript` in production

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string | null;
          income: number | null;
          payday: number | null;
          current_balance: number | null;
          savings_goal: number | null;
          currency: string;
          has_onboarded: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          income?: number | null;
          payday?: number | null;
          current_balance?: number | null;
          savings_goal?: number | null;
          currency?: string;
          has_onboarded?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          income?: number | null;
          payday?: number | null;
          current_balance?: number | null;
          savings_goal?: number | null;
          currency?: string;
          has_onboarded?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      fixed_expenses: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          amount: number;
          due_day: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          amount: number;
          due_day?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          amount?: number;
          due_day?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fixed_expenses_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          category: string;
          description: string;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          category?: string;
          description: string;
          date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          category?: string;
          description?: string;
          date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      conversation_history: {
        Row: {
          id: string;
          user_id: string;
          user_message: string;
          ai_response: string;
          intent: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          user_message: string;
          ai_response: string;
          intent?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          user_message?: string;
          ai_response?: string;
          intent?: string | null;
          metadata?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_history_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}
