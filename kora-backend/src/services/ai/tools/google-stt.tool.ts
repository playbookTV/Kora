import { v2 } from '@google-cloud/speech';
import { env } from '../../../config/env.js';

/**
 * Google Cloud Speech-to-Text Tool (v2 API)
 *
 * Uses the v2 API with auto_decoding_config for automatic format detection.
 * This enables native support for M4A/AAC files without transcoding.
 *
 * Supported formats with auto-detection:
 * - WAV (LINEAR16, MULAW, ALAW)
 * - FLAC
 * - MP3
 * - OGG_OPUS
 * - WEBM_OPUS
 * - MP4_AAC, M4A_AAC, MOV_AAC (AAC in containers)
 * - AMR, AMR-WB
 *
 * Docs: https://cloud.google.com/speech-to-text/v2/docs
 */

// Singleton client instance and project info
let client: v2.SpeechClient | null = null;
let projectId: string | null = null;

const getClient = (): { client: v2.SpeechClient; projectId: string } => {
  if (client && projectId) return { client, projectId };

  // Check for credentials JSON in env (for Railway/cloud deployments)
  if (env.GOOGLE_CLOUD_CREDENTIALS) {
    try {
      let credentialsStr = env.GOOGLE_CLOUD_CREDENTIALS.trim();

      // Check if it's base64 encoded (doesn't start with '{')
      if (!credentialsStr.startsWith('{')) {
        try {
          credentialsStr = Buffer.from(credentialsStr, 'base64').toString('utf-8');
          console.log('[GoogleSTT] Decoded base64 credentials');
        } catch {
          // Not base64, continue with original string
        }
      }

      // Handle case where Railway might double-quote the JSON
      if (credentialsStr.startsWith('"') && credentialsStr.endsWith('"')) {
        credentialsStr = credentialsStr.slice(1, -1);
      }

      // Trim any trailing whitespace/newlines
      credentialsStr = credentialsStr.trim();

      const credentials = JSON.parse(credentialsStr);

      if (!credentials.type || !credentials.project_id || !credentials.private_key) {
        throw new Error('Missing required fields in credentials (type, project_id, private_key)');
      }

      // Use v2 SpeechClient
      client = new v2.SpeechClient({ credentials });
      projectId = credentials.project_id as string;
      console.log('[GoogleSTT] Initialized v2 client for project:', projectId);
      return { client, projectId: projectId as string };
    } catch (parseError) {
      console.error('[GoogleSTT] Failed to parse GOOGLE_CLOUD_CREDENTIALS:', parseError);
      throw new Error('Invalid GOOGLE_CLOUD_CREDENTIALS format. Use raw JSON or base64-encoded JSON.');
    }
  }

  // No credentials configured - throw error
  throw new Error('GOOGLE_CLOUD_CREDENTIALS not configured');
};

export class GoogleSTTTool {
  /**
   * Check if a file format is supported by Google Cloud STT v2
   * With v2's auto_decoding_config, all common formats including M4A are supported
   * @param filename - The filename to check
   * @returns true (v2 supports all common formats via auto-detection)
   */
  static isFormatSupported(_filename?: string): boolean {
    // v2 API with auto_decoding_config supports all common audio formats
    // including M4A, MP4, AAC, WAV, MP3, FLAC, OGG, WEBM
    return true;
  }

  /**
   * Transcribe audio using Google Cloud Speech-to-Text v2 API
   * Uses auto_decoding_config for automatic format detection (supports M4A/AAC)
   *
   * @param audioBuffer - The audio buffer to transcribe
   * @param filename - Optional filename (used for logging only with v2)
   */
  static async transcribe(audioBuffer: Buffer, filename?: string): Promise<string> {
    // Validate input
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Audio buffer is required for transcription');
    }

    console.log(`[GoogleSTT] Transcribing ${audioBuffer.length} bytes, filename: ${filename || 'unknown'}`);

    try {
      const { client: sttClient, projectId: project } = getClient();

      // v2 API request with auto_decoding_config
      // This automatically detects encoding, sample rate, and channels
      const request = {
        // Use the default recognizer (no need to create one)
        recognizer: `projects/${project}/locations/global/recognizers/_`,
        config: {
          // Auto-detect encoding - supports M4A, AAC, MP3, WAV, FLAC, OGG, WEBM
          autoDecodingConfig: {},
          // Language configuration
          languageCodes: ['en-US', 'en-GB'],
          // Model selection - 'long' is best for general audio
          model: 'long',
          // Features
          features: {
            enableAutomaticPunctuation: true,
          },
        },
        content: audioBuffer,
      };

      // Call recognize (synchronous recognition for short audio)
      const [response] = await sttClient.recognize(request);

      if (!response.results || response.results.length === 0) {
        throw new Error('Google STT: No transcription results');
      }

      // Combine all transcription results
      const transcription = response.results
        .map(result => result.alternatives?.[0]?.transcript || '')
        .join(' ')
        .trim();

      if (!transcription) {
        throw new Error('Google STT: Empty transcription');
      }

      console.log(`[GoogleSTT] Successfully transcribed: "${transcription.substring(0, 50)}..."`);
      return transcription;
    } catch (error: unknown) {
      // Handle Google Cloud errors
      const err = error as { code?: number; message?: string; details?: string };

      if (err.code === 16 || err.message?.includes('UNAUTHENTICATED')) {
        throw new Error('Google STT: Authentication failed. Check service account credentials.');
      }

      if (err.code === 7 || err.message?.includes('PERMISSION_DENIED')) {
        throw new Error('Google STT: Permission denied. Enable Speech-to-Text API in Google Cloud Console.');
      }

      if (err.code === 3 || err.message?.includes('INVALID_ARGUMENT')) {
        throw new Error(`Google STT: Invalid request - ${err.details || err.message}`);
      }

      // Re-throw if it's already our error
      if (error instanceof Error && error.message.startsWith('Google STT')) {
        throw error;
      }

      console.error('[GoogleSTT] Unexpected error:', error);
      throw new Error(`Google STT: ${err.message || 'Failed to transcribe audio'}`);
    }
  }

  /**
   * Validate that credentials are working
   */
  static async validateCredentials(): Promise<boolean> {
    try {
      getClient();
      return true;
    } catch {
      return false;
    }
  }
}
