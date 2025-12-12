import { ChatOpenAI } from '@langchain/openai';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { env } from '../../../config/env.js';
import { createOnboardingPrompt } from '../prompts/onboarding.prompts.js';
import type { OnboardingContext, AIResponse } from '../../../types/index.js';

const llm = new ChatOpenAI({
  model: 'gpt-4o-mini',
  temperature: 0.7,
  apiKey: env.OPENAI_API_KEY,
  modelKwargs: {
    response_format: { type: 'json_object' },
  },
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
    console.log('[Onboarding] Input context:', JSON.stringify({
      step: context.step,
      currency: context.currency,
      collectedData: context.collectedData,
      userMessage: context.userMessage,
    }, null, 2));

    const result = await chain.invoke({
      step: context.step,
      currency: context.currency,
      collectedData: context.collectedData,
      userMessage: context.userMessage || '',
    });

    console.log('[Onboarding] AI result:', JSON.stringify(result, null, 2));

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
