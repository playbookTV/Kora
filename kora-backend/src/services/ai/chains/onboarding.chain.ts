import { ChatMistralAI } from '@langchain/mistralai';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { env } from '../../../config/env.js';
import { createOnboardingPrompt } from '../prompts/onboarding.prompts.js';
import type { OnboardingContext, AIResponse } from '../../../types/index.js';

const llm = new ChatMistralAI({
  model: 'mistral-small-latest',
  temperature: 0.7,
  apiKey: env.MISTRAL_API_KEY,
});

const outputParser = new JsonOutputParser();

export interface OnboardingChainInput {
  step: string;
  currency: string;
  collectedData: Record<string, unknown>;
  userMessage: string;
}

export interface OnboardingChainOutput {
  response: string;
  extracted?: Record<string, unknown>;
  calculated?: Record<string, unknown>;
  nextStep: string;
  shouldAdvance: boolean;
  waitingFor?: string;
}

export const createOnboardingChain = () => {
  return {
    invoke: async (input: OnboardingChainInput): Promise<OnboardingChainOutput> => {
      const prompt = createOnboardingPrompt(input.step, input.currency, input.collectedData);

      const chain = RunnableSequence.from([prompt, llm, outputParser]);

      const result = await chain.invoke({
        userMessage: input.userMessage,
      });

      return result as OnboardingChainOutput;
    },
  };
};

export const processOnboarding = async (context: OnboardingContext): Promise<AIResponse> => {
  const chain = createOnboardingChain();

  try {
    const result = await chain.invoke({
      step: context.step,
      currency: context.currency,
      collectedData: context.collectedData,
      userMessage: context.userMessage || '',
    });

    return {
      text: result.response,
      action: result.shouldAdvance ? 'NEXT_STEP' : 'DATA_EXTRACTED',
      data: {
        ...result.extracted,
        ...result.calculated,
      },
      nextStep: result.nextStep,
      shouldAdvance: result.shouldAdvance,
    };
  } catch (error) {
    console.error('Onboarding chain error:', error);
    return {
      text: "I'm having a little trouble connecting right now. Can you say that again?",
      action: 'ERROR',
    };
  }
};
