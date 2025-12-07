import { WhisperTool } from './tools/whisper.tool.js';
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
  // Speech-to-text
  static async transcribe(audioBuffer: Buffer, filename?: string): Promise<string> {
    return WhisperTool.transcribe(audioBuffer, filename);
  }

  // Text-to-speech
  static async synthesize(text: string): Promise<Buffer> {
    return ElevenLabsTool.synthesize(text);
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
export { ElevenLabsTool } from './tools/elevenlabs.tool.js';
export { processOnboarding } from './chains/onboarding.chain.js';
export { processConversation, classifyIntent } from './chains/conversation.chain.js';
