import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  // Server
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // AI Services
  OPENAI_API_KEY: z.string().min(1),
  MISTRAL_API_KEY: z.string().min(1),

  // Google Cloud TTS (Primary)
  // Create a service account at: https://console.cloud.google.com/iam-admin/serviceaccounts
  // Enable "Cloud Text-to-Speech API" in your project
  // Download the JSON key and paste its entire contents as a single-line string
  // Example: {"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n..."}
  GOOGLE_CLOUD_CREDENTIALS: z.string().optional(),

  // ElevenLabs (Fallback)
  ELEVENLABS_API_KEY: z.string().min(1),
  // Default voice: "Rachel" - a clear, professional female voice
  // Get other voice IDs from https://api.elevenlabs.io/v1/voices
  ELEVENLABS_VOICE_ID: z.string().default('21m00Tcm4TlvDq8ikWAM'),

  // Optional
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CORS_ORIGIN: z.string().default('*'),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
};

export const env = parseEnv();

export type Env = z.infer<typeof envSchema>;
