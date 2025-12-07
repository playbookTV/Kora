import { ChatMistralAI } from '@langchain/mistralai';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { env } from '../../../config/env.js';
import {
  createConversationPrompt,
  createIntentClassifierPrompt,
} from '../prompts/conversation.prompts.js';
import type { ConversationContext, AIResponse, ConversationIntent } from '../../../types/index.js';

const llm = new ChatMistralAI({
  model: 'mistral-small-latest',
  temperature: 0.7,
  apiKey: env.MISTRAL_API_KEY,
});

const outputParser = new JsonOutputParser();

export interface IntentClassification {
  intent: ConversationIntent;
  confidence: number;
  extracted: {
    amount: number | null;
    item: string | null;
    emotion: string | null;
  };
}

export interface ConversationChainOutput {
  response: string;
  analysis?: Record<string, unknown>;
  data?: Record<string, unknown>;
  logged?: Record<string, unknown>;
  impact?: Record<string, unknown>;
  emotionalAcknowledgment?: boolean;
  financialReassurance?: Record<string, unknown>;
  followUp?: Record<string, unknown>;
  clarificationNeeded?: boolean;
  suggestedIntent?: string;
}

// Intent classification chain
export const classifyIntent = async (message: string): Promise<IntentClassification> => {
  const prompt = createIntentClassifierPrompt();
  const chain = RunnableSequence.from([prompt, llm, outputParser]);

  try {
    const result = await chain.invoke({ message });
    return result as IntentClassification;
  } catch (error) {
    console.error('Intent classification error:', error);
    return {
      intent: 'GENERAL',
      confidence: 0.5,
      extracted: { amount: null, item: null, emotion: null },
    };
  }
};

// Conversation response chain
export const createConversationChain = () => {
  return {
    invoke: async (context: Record<string, unknown>): Promise<ConversationChainOutput> => {
      const prompt = createConversationPrompt(context);
      const chain = RunnableSequence.from([prompt, llm, outputParser]);

      const result = await chain.invoke({
        userMessage: context.userMessage as string,
      });

      return result as ConversationChainOutput;
    },
  };
};

export const processConversation = async (
  userMessage: string,
  context: Omit<ConversationContext, 'intent' | 'userMessage'>
): Promise<AIResponse> => {
  try {
    // 1. Classify intent
    const classification = await classifyIntent(userMessage);

    // 2. Build full context
    const fullContext = {
      ...context,
      intent: classification.intent,
      userMessage,
      detectedEmotion: classification.extracted.emotion,
      extractedAmount: classification.extracted.amount,
      extractedItem: classification.extracted.item,
    };

    // 3. Generate response
    const chain = createConversationChain();
    const result = await chain.invoke(fullContext as Record<string, unknown>);

    return {
      text: result.response,
      action: classification.intent,
      data: {
        ...result.analysis,
        ...result.data,
        ...result.logged,
        ...result.impact,
        classification,
        emotionalAcknowledgment: result.emotionalAcknowledgment,
        financialReassurance: result.financialReassurance,
        followUp: result.followUp,
        clarificationNeeded: result.clarificationNeeded,
        suggestedIntent: result.suggestedIntent,
      },
    };
  } catch (error) {
    console.error('Conversation chain error:', error);
    return {
      text: "I'm having a little trouble connecting right now. Can you say that again?",
      action: 'ERROR',
    };
  }
};
