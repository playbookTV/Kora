/**
 * AI API Service
 *
 * Routes all AI calls through the backend instead of calling
 * OpenAI/Mistral/ElevenLabs directly from the mobile app.
 * This keeps API keys secure on the server.
 */

import apiClient, { getErrorMessage, ApiResponse } from './client';
import { Paths, File } from 'expo-file-system';

export interface AIResponse {
  text: string;
  action?: string;
  data?: Record<string, unknown>;
  nextStep?: string;
  shouldAdvance?: boolean;
}

export interface TranscriptionResponse {
  transcription: string;
}

export interface ChatResponse {
  response: string;
  intent: string;
  data?: Record<string, unknown>;
}

export interface OnboardingResponse {
  response: string;
  extracted?: Record<string, unknown>;
  nextStep?: string;
  shouldAdvance?: boolean;
}

export interface VoiceResponse {
  transcription: string;
  response: AIResponse;
  audioUrl?: string;
}

/**
 * AI API methods - all calls routed through backend
 */
export const AIAPI = {
  /**
   * Transcribe audio file to text
   */
  async transcribe(audioUri: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        name: 'audio.m4a',
        type: 'audio/m4a',
      } as unknown as Blob);

      const response = await apiClient.post<ApiResponse<TranscriptionResponse>>(
        '/ai/transcribe',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Transcription failed');
      }

      return response.data.data.transcription;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Send a chat message and get AI response
   */
  async chat(message: string): Promise<ChatResponse> {
    try {
      const response = await apiClient.post<ApiResponse<ChatResponse>>('/ai/chat', {
        message,
      });

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Chat failed');
      }

      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Handle onboarding conversation step
   */
  async onboarding(
    message: string,
    step: string,
    collectedData: Record<string, unknown> = {}
  ): Promise<OnboardingResponse> {
    try {
      const response = await apiClient.post<ApiResponse<OnboardingResponse>>('/ai/onboarding', {
        message,
        step,
        collectedData,
      });

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Onboarding failed');
      }

      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Full voice pipeline - send audio, get audio response
   * Returns the transcription and audio file URI
   */
  async voice(audioUri: string): Promise<VoiceResponse> {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        name: 'audio.m4a',
        type: 'audio/m4a',
      } as unknown as Blob);

      const response = await apiClient.post('/ai/voice', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        responseType: 'arraybuffer',
      });

      // Check if response is audio (binary) or JSON
      const contentType = response.headers['content-type'];

      if (contentType?.includes('audio/mpeg')) {
        // Audio response - save to file
        const transcription = decodeURIComponent(response.headers['x-transcription'] || '');
        const responseText = decodeURIComponent(response.headers['x-response-text'] || '');

        // Save audio to cache
        const speechFile = new File(Paths.cache, `speech_${Date.now()}.mp3`);
        const base64 = Buffer.from(response.data, 'binary').toString('base64');
        speechFile.write(base64, { encoding: 'base64' });

        return {
          transcription,
          response: {
            text: responseText,
          },
          audioUrl: speechFile.uri,
        };
      } else {
        // JSON response (TTS failed on server)
        const jsonData = JSON.parse(new TextDecoder().decode(response.data));
        return {
          transcription: jsonData.data.transcription,
          response: jsonData.data.response,
        };
      }
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Text-to-speech - convert text to audio
   */
  async tts(text: string): Promise<string | null> {
    try {
      const response = await apiClient.post('/ai/tts', { text }, { responseType: 'arraybuffer' });

      // Save audio to cache
      const speechFile = new File(Paths.cache, `tts_${Date.now()}.mp3`);
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      speechFile.write(base64, { encoding: 'base64' });

      return speechFile.uri;
    } catch (error) {
      console.log('TTS failed:', getErrorMessage(error));
      return null; // Caller can use fallback native speech
    }
  },
};

export default AIAPI;
