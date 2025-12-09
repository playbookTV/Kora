import { SpeechClient, protos } from '@google-cloud/speech';
import { env } from '../../../config/env.js';

/**
 * Google Cloud Speech-to-Text Tool
 *
 * Uses the official Google Cloud Speech SDK with service account authentication.
 * Docs: https://cloud.google.com/speech-to-text/docs/quickstart-client-libraries
 *
 * Authentication:
 * - Uses GOOGLE_CLOUD_CREDENTIALS env var (same as TTS)
 */

type IRecognizeRequest = protos.google.cloud.speech.v1.IRecognizeRequest;

// Singleton client instance
let client: SpeechClient | null = null;

const getClient = (): SpeechClient => {
  if (client) return client;

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

      client = new SpeechClient({ credentials });
      console.log('[GoogleSTT] Initialized with credentials for project:', credentials.project_id);
      return client;
    } catch (parseError) {
      console.error('[GoogleSTT] Failed to parse GOOGLE_CLOUD_CREDENTIALS:', parseError);
      throw new Error('Invalid GOOGLE_CLOUD_CREDENTIALS format. Use raw JSON or base64-encoded JSON.');
    }
  }

  // No credentials configured - throw error
  throw new Error('GOOGLE_CLOUD_CREDENTIALS not configured');
};

// Formats that Google Cloud Speech-to-Text v1 does NOT support natively
// M4A (AAC in MP4 container), MP4, and AAC require transcoding
const UNSUPPORTED_FORMATS = ['.m4a', '.mp4', '.aac', '.m4b', '.m4p'];

export class GoogleSTTTool {
  /**
   * Check if a file format is supported by Google Cloud STT
   * @param filename - The filename to check
   * @returns true if supported, false otherwise
   */
  static isFormatSupported(filename?: string): boolean {
    if (!filename) return true; // Let Google try to auto-detect
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return !UNSUPPORTED_FORMATS.includes(ext);
  }

  /**
   * Transcribe audio using Google Cloud Speech-to-Text
   * @param audioBuffer - The audio buffer to transcribe
   * @param filename - Optional filename to determine audio format
   */
  static async transcribe(audioBuffer: Buffer, filename?: string): Promise<string> {
    // Validate input
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Audio buffer is required for transcription');
    }

    // Check if format is supported
    if (!this.isFormatSupported(filename)) {
      const ext = filename?.substring(filename.lastIndexOf('.')) || 'unknown';
      throw new Error(`Google STT: Unsupported format ${ext}. Use Whisper fallback for M4A/AAC files.`);
    }

    console.log(`[GoogleSTT] Transcribing ${audioBuffer.length} bytes, filename: ${filename || 'unknown'}`);

    try {
      const sttClient = getClient();

      // Determine encoding based on filename
      let encoding: protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding;
      let sampleRateHertz = 48000; // Default for most mobile recordings

      if (filename?.endsWith('.wav')) {
        encoding = protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16;
      } else if (filename?.endsWith('.flac')) {
        encoding = protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.FLAC;
      } else if (filename?.endsWith('.ogg') || filename?.endsWith('.opus')) {
        encoding = protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.OGG_OPUS;
      } else if (filename?.endsWith('.mp3')) {
        encoding = protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.MP3;
      } else if (filename?.endsWith('.webm')) {
        encoding = protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.WEBM_OPUS;
      } else {
        // Let Google auto-detect
        encoding = protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED;
      }

      const request: IRecognizeRequest = {
        audio: {
          content: audioBuffer.toString('base64'),
        },
        config: {
          encoding,
          sampleRateHertz,
          languageCode: 'en-US',
          // Enable automatic punctuation
          enableAutomaticPunctuation: true,
          // Use enhanced model for better accuracy
          model: 'latest_long',
          // Alternative languages to detect
          alternativeLanguageCodes: ['en-GB', 'en-NG'],
        },
      };

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
