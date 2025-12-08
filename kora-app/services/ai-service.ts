import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system/legacy';
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
      // Read the audio file and create form data
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!fileInfo.exists) {
        throw new Error('Audio file not found');
      }

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
    } catch (error) {
      console.error('Transcribe Error:', error);
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
   * Text-to-Speech using backend (which proxies to ElevenLabs)
   * Falls back to expo-speech if backend fails
   */
  static async speak(text: string): Promise<string | null> {
    try {
      const response = await apiClient.post('/ai/tts', { text }, {
        responseType: 'arraybuffer',
      });

      // Save the audio to a temp file
      const base64Audio = btoa(
        new Uint8Array(response.data).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const audioPath = `${FileSystem.cacheDirectory}speech_${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(audioPath, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return audioPath;
    } catch (error) {
      console.log('TTS via backend failed, using fallback:', error);
      Speech.speak(text);
      return null;
    }
  }
}
