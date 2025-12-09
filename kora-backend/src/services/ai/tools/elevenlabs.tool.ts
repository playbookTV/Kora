import axios, { AxiosError } from 'axios';
import { env } from '../../../config/env.js';

/**
 * ElevenLabs Text-to-Speech Tool
 *
 * Uses the ElevenLabs API for high-quality speech synthesis.
 * Docs: https://elevenlabs.io/docs/api-reference/text-to-speech/convert
 */

// Available models (ordered by recommendation for real-time use)
const MODELS = {
  FLASH_V2_5: 'eleven_flash_v2_5',      // Ultra-low latency (~75ms), 32 languages
  TURBO_V2_5: 'eleven_turbo_v2_5',      // Higher quality, slightly more latency, 32 languages
  MULTILINGUAL_V2: 'eleven_multilingual_v2', // Highest quality, emotional, 29 languages
} as const;

// Default configuration
const DEFAULT_MODEL = MODELS.FLASH_V2_5; // Best for real-time apps
const DEFAULT_OUTPUT_FORMAT = 'mp3_44100_128'; // Good quality, reasonable size

interface ElevenLabsErrorResponse {
  detail?: {
    status?: string;
    message?: string;
  };
}

export class ElevenLabsTool {
  private static readonly baseUrl = 'https://api.elevenlabs.io/v1';

  /**
   * Synthesize text to speech
   * @param text - The text to convert to speech (max ~5000 chars recommended)
   * @param options - Optional configuration
   */
  static async synthesize(
    text: string,
    options?: {
      modelId?: string;
      voiceId?: string;
      stability?: number;
      similarityBoost?: number;
      outputFormat?: string;
    }
  ): Promise<Buffer> {
    const voiceId = options?.voiceId || env.ELEVENLABS_VOICE_ID;
    const modelId = options?.modelId || DEFAULT_MODEL;
    const outputFormat = options?.outputFormat || DEFAULT_OUTPUT_FORMAT;

    // Validate inputs
    if (!text || text.trim().length === 0) {
      throw new Error('Text is required for speech synthesis');
    }

    if (text.length > 5000) {
      console.warn(`Text length (${text.length}) exceeds recommended limit of 5000 characters`);
    }

    const url = `${this.baseUrl}/text-to-speech/${voiceId}`;

    const requestBody = {
      text: text.trim(),
      model_id: modelId,
      voice_settings: {
        stability: options?.stability ?? 0.5,
        similarity_boost: options?.similarityBoost ?? 0.75,
      },
    };

    console.log(`[ElevenLabs] Synthesizing ${text.length} chars with model ${modelId}, voice ${voiceId}`);

    try {
      const response = await axios.post(url, requestBody, {
        headers: {
          'xi-api-key': env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        params: {
          output_format: outputFormat,
        },
        responseType: 'arraybuffer',
        timeout: 30000, // 30 second timeout
        validateStatus: (status) => status < 500, // Don't throw on 4xx, handle manually
      });

      // Check for error responses
      if (response.status !== 200) {
        let errorMessage = `ElevenLabs API error (${response.status})`;

        try {
          // Try to parse error response
          const errorText = Buffer.from(response.data).toString('utf-8');
          const errorJson: ElevenLabsErrorResponse = JSON.parse(errorText);

          if (errorJson.detail?.status) {
            errorMessage = `ElevenLabs: ${errorJson.detail.status}`;
            if (errorJson.detail.message) {
              errorMessage += ` - ${errorJson.detail.message}`;
            }
          }

          console.error(`[ElevenLabs] API Error:`, errorJson);
        } catch {
          console.error(`[ElevenLabs] Raw error response:`, Buffer.from(response.data).toString('utf-8'));
        }

        throw new Error(errorMessage);
      }

      const audioBuffer = Buffer.from(response.data);
      console.log(`[ElevenLabs] Successfully generated ${audioBuffer.length} bytes of audio`);

      return audioBuffer;
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('ElevenLabs request timed out');
        }
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          throw new Error('Unable to connect to ElevenLabs API');
        }

        // If we have a response with data, try to extract error details
        if (error.response?.data) {
          try {
            const errorText = Buffer.from(error.response.data).toString('utf-8');
            const errorJson: ElevenLabsErrorResponse = JSON.parse(errorText);
            if (errorJson.detail?.status) {
              throw new Error(`ElevenLabs: ${errorJson.detail.status}`);
            }
          } catch {
            // Ignore parsing errors, use generic message
          }
        }
      }

      // Re-throw if it's already our error
      if (error instanceof Error && error.message.startsWith('ElevenLabs')) {
        throw error;
      }

      console.error('[ElevenLabs] Unexpected error:', error);
      throw new Error('Failed to synthesize speech');
    }
  }

  /**
   * Get available voices from ElevenLabs
   */
  static async getVoices(): Promise<Array<{ voice_id: string; name: string }>> {
    try {
      const response = await axios.get(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': env.ELEVENLABS_API_KEY,
        },
        timeout: 10000,
      });

      return response.data.voices;
    } catch (error) {
      console.error('[ElevenLabs] Failed to fetch voices:', error);
      throw new Error('Failed to fetch voices');
    }
  }

  /**
   * Validate that the API key is working
   */
  static async validateApiKey(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/user`, {
        headers: {
          'xi-api-key': env.ELEVENLABS_API_KEY,
        },
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
