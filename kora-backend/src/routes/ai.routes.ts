import type { FastifyInstance } from 'fastify';
import { AIOrchestrator } from '../services/ai/index.js';
import { UserService } from '../services/user.service.js';
import { TransactionService } from '../services/transaction.service.js';
import {
  chatRequestSchema,
  onboardingRequestSchema,
  ttsRequestSchema,
} from '../schemas/ai.schema.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import type { AuthenticatedRequest, OnboardingStep, Currency } from '../types/index.js';

// Helper to calculate finance state
const calculateFinanceState = async (userId: string, accessToken: string) => {
  const profile = await UserService.getProfile(userId, accessToken);
  const expenses = await UserService.getFixedExpenses(userId, accessToken);
  const stats = await TransactionService.getStats(userId, accessToken);

  const totalFixedExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const flexibleIncome = (profile.income || 0) - totalFixedExpenses;

  // Calculate days to payday
  const today = new Date();
  const currentDay = today.getDate();
  const payday = profile.payday || 1;
  let daysToPayday: number;

  if (currentDay < payday) {
    daysToPayday = payday - currentDay;
  } else {
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, payday);
    daysToPayday = Math.ceil((nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Calculate safe spend
  const availableNow = profile.current_balance || 0;
  const safeSpendToday = daysToPayday > 0 ? Math.floor(availableNow / daysToPayday) : availableNow;

  return {
    profile,
    totalFixedExpenses,
    flexibleIncome,
    daysToPayday,
    safeSpendToday,
    spentToday: stats.spentToday,
    flexibleRemaining: flexibleIncome - stats.totalSpent,
  };
};

export async function aiRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authMiddleware);

  // POST /ai/transcribe - Upload audio, get transcription
  fastify.post('/transcribe', async (request, reply) => {
    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          success: false,
          error: 'No audio file provided',
        });
      }

      const buffer = await data.toBuffer();
      const transcription = await AIOrchestrator.transcribe(buffer, data.filename);

      return reply.send({
        success: true,
        data: { transcription },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transcription failed';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  });

  // POST /ai/chat - Send text, get AI response
  fastify.post('/chat', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const result = chatRequestSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        details: result.error.issues,
      });
    }

    try {
      const financeState = await calculateFinanceState(user.id, accessToken);

      const response = await AIOrchestrator.handleConversation(result.data.message, {
        currency: financeState.profile.currency as Currency,
        userProfile: {
          name: financeState.profile.name || undefined,
          income: financeState.profile.income || 0,
          payday: financeState.profile.payday || 1,
          fixedExpenses: financeState.totalFixedExpenses,
          currentBalance: financeState.profile.current_balance || 0,
          savingsGoal: financeState.profile.savings_goal || undefined,
        },
        financialState: {
          safeSpendToday: financeState.safeSpendToday,
          daysToPayday: financeState.daysToPayday,
          spentToday: financeState.spentToday,
          upcomingBills: 0, // TODO: Calculate from fixed expenses
          flexibleRemaining: financeState.flexibleRemaining,
        },
      });

      return reply.send({
        success: true,
        data: response,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Chat failed';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  });

  // POST /ai/onboarding - Onboarding conversation step
  fastify.post('/onboarding', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const result = onboardingRequestSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        details: result.error.issues,
      });
    }

    try {
      const profile = await UserService.getProfile(user.id, accessToken);

      const response = await AIOrchestrator.handleOnboarding({
        step: result.data.step as OnboardingStep,
        currency: profile.currency as Currency,
        collectedData: result.data.collectedData || {},
        userMessage: result.data.message,
      });

      return reply.send({
        success: true,
        data: response,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Onboarding failed';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  });

  // POST /ai/voice - Full voice flow (audio in, response out)
  fastify.post('/voice', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;

    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          success: false,
          error: 'No audio file provided',
        });
      }

      const buffer = await data.toBuffer();
      const financeState = await calculateFinanceState(user.id, accessToken);

      const result = await AIOrchestrator.processVoice(buffer, {
        isOnboarding: !financeState.profile.has_onboarded,
        onboardingContext: !financeState.profile.has_onboarded
          ? {
              step: 'WELCOME' as OnboardingStep,
              currency: financeState.profile.currency as Currency,
              collectedData: {},
            }
          : undefined,
        conversationContext: financeState.profile.has_onboarded
          ? {
              currency: financeState.profile.currency as Currency,
              userProfile: {
                name: financeState.profile.name || undefined,
                income: financeState.profile.income || 0,
                payday: financeState.profile.payday || 1,
                fixedExpenses: financeState.totalFixedExpenses,
                currentBalance: financeState.profile.current_balance || 0,
                savingsGoal: financeState.profile.savings_goal || undefined,
              },
              financialState: {
                safeSpendToday: financeState.safeSpendToday,
                daysToPayday: financeState.daysToPayday,
                spentToday: financeState.spentToday,
                upcomingBills: 0,
                flexibleRemaining: financeState.flexibleRemaining,
              },
            }
          : undefined,
      });

      // If audio response is available, return it
      if (result.audioResponse) {
        reply.header('Content-Type', 'audio/mpeg');
        reply.header('X-Transcription', encodeURIComponent(result.transcription));
        reply.header('X-Response-Text', encodeURIComponent(result.response.text));
        return reply.send(result.audioResponse);
      }

      // Otherwise return JSON
      return reply.send({
        success: true,
        data: {
          transcription: result.transcription,
          response: result.response,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Voice processing failed';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  });

  // POST /ai/tts - Text-to-speech conversion
  fastify.post('/tts', async (request, reply) => {
    const result = ttsRequestSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        details: result.error.issues,
      });
    }

    try {
      const audioBuffer = await AIOrchestrator.synthesize(result.data.text);

      reply.header('Content-Type', 'audio/mpeg');
      return reply.send(audioBuffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'TTS failed';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  });
}
