import { Paths, File } from 'expo-file-system';
import apiClient from './api/client';

export interface AIResponse {
  text: string;
  action?: string;
  data?: any;
  nextStep?: string;
  shouldAdvance?: boolean;
}

export class AIService {
  /**
   * Transcribe audio using backend (which proxies to OpenAI Whisper)
   */
  static async transcribe(audioUri: string): Promise<string> {
    try {
      console.log('Transcribing audio from:', audioUri);

      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        name: 'audio.m4a',
        type: 'audio/m4a',
      } as any);

      const response = await apiClient.post('/ai/transcribe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Transcription failed');
      }

      return response.data.data.transcription;
    } catch (error: any) {
      console.error('Transcribe Error:', error);
      // Log detailed error info
      if (error?.response) {
        console.error('Transcribe Error Status:', error.response.status);
        console.error('Transcribe Error Data:', error.response.data);
      }
      throw new Error('Failed to transcribe audio.');
    }
  }

  /**
   * Generate response - routes to appropriate backend endpoint
   */
  static async generateResponse(userText: string, context: any): Promise<AIResponse> {
    try {
      if (context.isOnboarding || (context.step && context.step !== 'COMPLETE')) {
        return await this.handleOnboardingFlow(userText, context);
      } else {
        return await this.handleConversationFlow(userText, context);
      }
    } catch (error) {
      console.error('AI Service Error:', error);
      return {
        text: "I'm having a little trouble connecting right now. Can you say that again?",
        action: 'ERROR',
      };
    }
  }

  /**
   * Handle onboarding via backend
   */
  private static async handleOnboardingFlow(userText: string, context: any): Promise<AIResponse> {
    const response = await apiClient.post('/ai/onboarding', {
      message: userText,
      step: context.step,
      collectedData: context.collectedData || {},
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Onboarding failed');
    }

    const data = response.data.data;
    return {
      text: data.response || data.text,
      action: data.shouldAdvance ? 'NEXT_STEP' : 'DATA_EXTRACTED',
      data: data.extracted || data.data || {},
      nextStep: data.nextStep,
      shouldAdvance: data.shouldAdvance,
    };
  }

  /**
   * Handle conversation via backend
   */
  private static async handleConversationFlow(userText: string, context: any): Promise<AIResponse> {
    const response = await apiClient.post('/ai/chat', {
      message: userText,
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Chat failed');
    }

    const data = response.data.data;
    return {
      text: data.response || data.text,
      action: data.action || data.intent,
      data: data.data || data.analysis || {},
    };
  }

  /**
   * Text-to-Speech using backend (Google Cloud TTS primary, ElevenLabs fallback)
   * Returns the URI of the audio file, or throws if all providers fail
   */
  static async speak(text: string): Promise<string> {
    // Skip empty text
    if (!text || text.trim().length === 0) {
      throw new Error('No text provided for speech synthesis');
    }

    console.log('[TTS] Requesting speech synthesis for', text.length, 'characters');

    try {
      const response = await apiClient.post('/ai/tts', { text }, {
        responseType: 'arraybuffer',
        timeout: 45000, // 45 second timeout to allow for fallback chain
      });

      // Check if we got valid audio data
      if (!response.data || response.data.byteLength === 0) {
        throw new Error('Empty audio response from server');
      }

      // Save the audio to a temp file using new expo-file-system API
      const base64Audio = btoa(
        new Uint8Array(response.data).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const speechFile = new File(Paths.cache, `speech_${Date.now()}.mp3`);
      await speechFile.write(base64Audio, { encoding: 'base64' });

      console.log('[TTS] Audio saved to:', speechFile.uri);
      return speechFile.uri;
    } catch (error: any) {
      // Log the specific error for debugging
      let errorMessage = error?.message || 'Unknown error';

      // Try to decode error from arraybuffer response
      if (error?.response?.data) {
        try {
          if (error.response.data instanceof ArrayBuffer) {
            const decoder = new TextDecoder('utf-8');
            const jsonStr = decoder.decode(error.response.data);
            const errorJson = JSON.parse(jsonStr);
            errorMessage = errorJson.error || errorMessage;
          } else if (typeof error.response.data === 'object') {
            errorMessage = error.response.data.error || errorMessage;
          }
        } catch {
          // Ignore decode errors
        }
      }

      console.error('[TTS] Speech synthesis failed:', errorMessage);

      // Re-throw - no fallback to native speech
      throw new Error(`Speech synthesis failed: ${errorMessage}`);
    }
  }
}
