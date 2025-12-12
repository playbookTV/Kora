import { WhisperTool } from './tools/whisper.tool.js';
import { GoogleSTTTool } from './tools/google-stt.tool.js';
import { GoogleTTSTool } from './tools/google-tts.tool.js';
import { ElevenLabsTool } from './tools/elevenlabs.tool.js';
import { processOnboarding } from './chains/onboarding.chain.js';
import { processConversation } from './chains/conversation.chain.js';
import type {
  OnboardingContext,
  ConversationContext,
  AIResponse,
  Currency,
} from '../../types/index.js';

export class AIOrchestrator {
  // Speech-to-text with fallback chain: Whisper (primary) -> Google STT v2 (fallback)
  static async transcribe(audioBuffer: Buffer, filename?: string): Promise<string> {
    // Try OpenAI Whisper first (primary)
    try {
      console.log('[AIOrchestrator] Attempting OpenAI Whisper (primary)...');
      const transcription = await WhisperTool.transcribe(audioBuffer, filename);
      console.log('[AIOrchestrator] Whisper succeeded');
      return transcription;
    } catch (whisperError) {
      console.warn('[AIOrchestrator] Whisper failed:', whisperError instanceof Error ? whisperError.message : whisperError);
      console.log('[AIOrchestrator] Falling back to Google STT v2...');
    }

    // Fall back to Google Cloud STT v2
    try {
      const transcription = await GoogleSTTTool.transcribe(audioBuffer, filename);
      console.log('[AIOrchestrator] Google STT v2 fallback succeeded');
      return transcription;
    } catch (googleError) {
      console.error('[AIOrchestrator] Google STT fallback also failed:', googleError instanceof Error ? googleError.message : googleError);
      throw new Error('All STT providers failed. Unable to transcribe audio.');
    }
  }

  // Text-to-speech with fallback chain: Google TTS (primary) -> ElevenLabs (fallback)
  static async synthesize(text: string): Promise<Buffer> {
    // Try Google Cloud TTS first (primary)
    try {
      console.log('[AIOrchestrator] Attempting Google Cloud TTS (primary)...');
      const audioBuffer = await GoogleTTSTool.synthesize(text);
      console.log('[AIOrchestrator] Google TTS succeeded');
      return audioBuffer;
    } catch (googleError) {
      console.warn('[AIOrchestrator] Google TTS failed:', googleError instanceof Error ? googleError.message : googleError);
      console.log('[AIOrchestrator] Falling back to ElevenLabs...');
    }

    // Fall back to ElevenLabs
    try {
      const audioBuffer = await ElevenLabsTool.synthesize(text);
      console.log('[AIOrchestrator] ElevenLabs fallback succeeded');
      return audioBuffer;
    } catch (elevenLabsError) {
      console.error('[AIOrchestrator] ElevenLabs fallback also failed:', elevenLabsError instanceof Error ? elevenLabsError.message : elevenLabsError);
      throw new Error('All TTS providers failed. Unable to synthesize speech.');
    }
  }

  // Onboarding conversation
  static async handleOnboarding(context: OnboardingContext): Promise<AIResponse> {
    return processOnboarding(context);
  }

  // General conversation
  static async handleConversation(
    userMessage: string,
    context: Omit<ConversationContext, 'intent' | 'userMessage'>
  ): Promise<AIResponse> {
    return processConversation(userMessage, context);
  }

  // Full voice pipeline: audio in, audio out
  static async processVoice(
    audioBuffer: Buffer,
    context: {
      isOnboarding: boolean;
      onboardingContext?: OnboardingContext;
      conversationContext?: Omit<ConversationContext, 'intent' | 'userMessage'>;
    }
  ): Promise<{
    transcription: string;
    response: AIResponse;
    audioResponse?: Buffer;
  }> {
    // 1. Transcribe
    const transcription = await this.transcribe(audioBuffer);

    // 2. Generate response
    let response: AIResponse;

    if (context.isOnboarding && context.onboardingContext) {
      response = await this.handleOnboarding({
        ...context.onboardingContext,
        userMessage: transcription,
      });
    } else if (context.conversationContext) {
      response = await this.handleConversation(transcription, context.conversationContext);
    } else {
      response = {
        text: "I'm not sure what context we're in. Can you tell me more?",
        action: 'ERROR',
      };
    }

    // 3. Synthesize response (optional - can be skipped for text-only)
    let audioResponse: Buffer | undefined;
    try {
      audioResponse = await this.synthesize(response.text);
    } catch (error) {
      console.warn('TTS failed, returning text only:', error);
    }

    return {
      transcription,
      response,
      audioResponse,
    };
  }
}

// Re-export tools and chains for direct access if needed
export { WhisperTool } from './tools/whisper.tool.js';
export { GoogleSTTTool } from './tools/google-stt.tool.js';
export { GoogleTTSTool } from './tools/google-tts.tool.js';
export { ElevenLabsTool } from './tools/elevenlabs.tool.js';
export { processOnboarding } from './chains/onboarding.chain.js';
export { processConversation, classifyIntent } from './chains/conversation.chain.js';
