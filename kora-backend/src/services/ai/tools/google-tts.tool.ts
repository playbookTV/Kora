import { TextToSpeechClient, protos } from '@google-cloud/text-to-speech';
import { env } from '../../../config/env.js';

/**
 * Google Cloud Text-to-Speech Tool
 *
 * Uses the official Google Cloud TTS SDK with service account authentication.
 * Docs: https://cloud.google.com/text-to-speech/docs/quickstart-client-libraries
 *
 * Authentication:
 * - Set GOOGLE_APPLICATION_CREDENTIALS env var to path of service account JSON
 * - OR set GOOGLE_CLOUD_CREDENTIALS env var to the JSON content directly (for Railway)
 */

type ISynthesizeSpeechRequest = protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest;

// Voice configuration
const VOICES = {
  // Journey voices - conversational, expressive (recommended)
  JOURNEY_FEMALE: { name: 'en-US-Journey-F', ssmlGender: 'FEMALE' as const },
  JOURNEY_MALE: { name: 'en-US-Journey-D', ssmlGender: 'MALE' as const },
  // Neural2 voices - latest, highest quality
  NEURAL2_FEMALE: { name: 'en-US-Neural2-F', ssmlGender: 'FEMALE' as const },
  NEURAL2_MALE: { name: 'en-US-Neural2-D', ssmlGender: 'MALE' as const },
  // WaveNet voices - natural sounding
  WAVENET_FEMALE: { name: 'en-US-Wavenet-F', ssmlGender: 'FEMALE' as const },
  WAVENET_MALE: { name: 'en-US-Wavenet-D', ssmlGender: 'MALE' as const },
  // Standard voices - fast, cost-effective
  STANDARD_FEMALE: { name: 'en-US-Standard-F', ssmlGender: 'FEMALE' as const },
  STANDARD_MALE: { name: 'en-US-Standard-D', ssmlGender: 'MALE' as const },
} as const;

// Default configuration
const DEFAULT_VOICE = VOICES.JOURNEY_FEMALE;
const DEFAULT_LANGUAGE_CODE = 'en-US';

// Singleton client instance
let client: TextToSpeechClient | null = null;

const getClient = (): TextToSpeechClient => {
  if (client) return client;

  // Check for credentials JSON in env (for Railway/cloud deployments)
  if (env.GOOGLE_CLOUD_CREDENTIALS) {
    try {
      let credentialsStr = env.GOOGLE_CLOUD_CREDENTIALS.trim();

      // Check if it's base64 encoded (doesn't start with '{')
      if (!credentialsStr.startsWith('{')) {
        try {
          credentialsStr = Buffer.from(credentialsStr, 'base64').toString('utf-8');
          console.log('[GoogleTTS] Decoded base64 credentials');
        } catch {
          // Not base64, continue with original string
        }
      }

      // Handle case where Railway might double-quote the JSON
      if (credentialsStr.startsWith('"') && credentialsStr.endsWith('"')) {
        credentialsStr = credentialsStr.slice(1, -1);
      }

      // The base64 decoded string has a trailing newline - remove it
      credentialsStr = credentialsStr.trim();

      const credentials = JSON.parse(credentialsStr);

      if (!credentials.type || !credentials.project_id || !credentials.private_key) {
        throw new Error('Missing required fields in credentials (type, project_id, private_key)');
      }

      client = new TextToSpeechClient({ credentials });
      console.log('[GoogleTTS] Initialized with credentials for project:', credentials.project_id);
      return client;
    } catch (parseError) {
      console.error('[GoogleTTS] Failed to parse GOOGLE_CLOUD_CREDENTIALS:', parseError);
      console.error('[GoogleTTS] Raw value length:', env.GOOGLE_CLOUD_CREDENTIALS.length);
      // Show first char to debug format issues
      console.error('[GoogleTTS] First char code:', env.GOOGLE_CLOUD_CREDENTIALS.charCodeAt(0));
      throw new Error('Invalid GOOGLE_CLOUD_CREDENTIALS format. Use raw JSON or base64-encoded JSON.');
    }
  }

  // No credentials configured - throw error
  throw new Error('GOOGLE_CLOUD_CREDENTIALS not configured');
};

export class GoogleTTSTool {
  /**
   * Synthesize text to speech using Google Cloud TTS
   * @param text - The text to convert to speech
   * @param options - Optional configuration
   */
  static async synthesize(
    text: string,
    options?: {
      voiceName?: string;
      languageCode?: string;
      ssmlGender?: 'MALE' | 'FEMALE' | 'NEUTRAL';
      speakingRate?: number;
      pitch?: number;
    }
  ): Promise<Buffer> {
    // Validate input
    if (!text || text.trim().length === 0) {
      throw new Error('Text is required for speech synthesis');
    }

    if (text.length > 5000) {
      console.warn(`[GoogleTTS] Text length (${text.length}) exceeds recommended limit of 5000 characters`);
    }

    const voiceName = options?.voiceName || DEFAULT_VOICE.name;
    console.log(`[GoogleTTS] Synthesizing ${text.length} chars with voice ${voiceName}`);

    try {
      const ttsClient = getClient();

      const request: ISynthesizeSpeechRequest = {
        input: { text: text.trim() },
        voice: {
          languageCode: options?.languageCode || DEFAULT_LANGUAGE_CODE,
          name: voiceName,
          ssmlGender: options?.ssmlGender || DEFAULT_VOICE.ssmlGender,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: options?.speakingRate ?? 1.0,
          pitch: options?.pitch ?? 0.0,
        },
      };

      const [response] = await ttsClient.synthesizeSpeech(request);

      if (!response.audioContent) {
        throw new Error('Google TTS: No audio content in response');
      }

      // Convert to Buffer (audioContent can be string or Uint8Array)
      let audioBuffer: Buffer;
      if (typeof response.audioContent === 'string') {
        audioBuffer = Buffer.from(response.audioContent, 'base64');
      } else {
        audioBuffer = Buffer.from(response.audioContent);
      }

      console.log(`[GoogleTTS] Successfully generated ${audioBuffer.length} bytes of audio`);
      return audioBuffer;
    } catch (error: unknown) {
      // Handle Google Cloud errors
      const err = error as { code?: number; message?: string; details?: string };

      if (err.code === 16 || err.message?.includes('UNAUTHENTICATED')) {
        throw new Error('Google TTS: Authentication failed. Check service account credentials.');
      }

      if (err.code === 7 || err.message?.includes('PERMISSION_DENIED')) {
        throw new Error('Google TTS: Permission denied. Enable Text-to-Speech API in Google Cloud Console.');
      }

      if (err.code === 3 || err.message?.includes('INVALID_ARGUMENT')) {
        throw new Error(`Google TTS: Invalid request - ${err.details || err.message}`);
      }

      // Re-throw if it's already our error
      if (error instanceof Error && error.message.startsWith('Google TTS')) {
        throw error;
      }

      console.error('[GoogleTTS] Unexpected error:', error);
      throw new Error(`Google TTS: ${err.message || 'Failed to synthesize speech'}`);
    }
  }

  /**
   * Get list of available voices
   */
  static async getVoices(): Promise<Array<{ name: string; languageCodes: string[]; ssmlGender: string }>> {
    try {
      const ttsClient = getClient();
      const [response] = await ttsClient.listVoices({});

      return (response.voices || []).map(voice => ({
        name: voice.name || '',
        languageCodes: voice.languageCodes || [],
        ssmlGender: String(voice.ssmlGender || 'NEUTRAL'),
      }));
    } catch (error) {
      console.error('[GoogleTTS] Failed to fetch voices:', error);
      throw new Error('Failed to fetch Google TTS voices');
    }
  }

  /**
   * Validate that credentials are working
   */
  static async validateCredentials(): Promise<boolean> {
    try {
      const ttsClient = getClient();
      await ttsClient.listVoices({});
      return true;
    } catch {
      return false;
    }
  }
}
