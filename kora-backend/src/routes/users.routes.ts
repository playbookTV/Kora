import type { FastifyInstance } from 'fastify';
import { UserService } from '../services/user.service.js';
import {
  updateProfileSchema,
  createFixedExpenseSchema,
  updateFixedExpenseSchema,
} from '../schemas/user.schema.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../types/index.js';

export async function usersRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authMiddleware);

  // GET /users/profile
  fastify.get('/profile', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;

    try {
      const data = await UserService.getProfile(user.id, accessToken);
      return reply.send({
        success: true,
        data,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get profile';
      return reply.status(404).send({
        success: false,
        error: message,
      });
    }
  });

  // PUT /users/profile
  fastify.put('/profile', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const result = updateProfileSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        details: result.error.issues,
      });
    }

    try {
      const data = await UserService.updateProfile(user.id, accessToken, result.data);
      return reply.send({
        success: true,
        data,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  });

  // POST /users/complete-onboarding
  fastify.post('/complete-onboarding', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;

    try {
      const data = await UserService.completeOnboarding(user.id, accessToken);
      return reply.send({
        success: true,
        data,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to complete onboarding';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  });

  // DELETE /users/account
  fastify.delete('/account', async (request, reply) => {
    const { user } = request as AuthenticatedRequest;

    try {
      await UserService.deleteAccount(user.id);
      return reply.send({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete account';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  });

  // Fixed Expenses Routes

  // GET /users/expenses
  fastify.get('/expenses', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;

    try {
      const data = await UserService.getFixedExpenses(user.id, accessToken);
      return reply.send({
        success: true,
        data,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get expenses';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  });

  // POST /users/expenses
  fastify.post('/expenses', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const result = createFixedExpenseSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        details: result.error.issues,
      });
    }

    try {
      const data = await UserService.createFixedExpense(user.id, accessToken, result.data);
      return reply.status(201).send({
        success: true,
        data,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create expense';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  });

  // PUT /users/expenses/:id
  fastify.put<{ Params: { id: string } }>('/expenses/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;
    const result = updateFixedExpenseSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        details: result.error.issues,
      });
    }

    try {
      const data = await UserService.updateFixedExpense(user.id, id, accessToken, result.data);
      return reply.send({
        success: true,
        data,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update expense';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  });

  // DELETE /users/expenses/:id
  fastify.delete<{ Params: { id: string } }>('/expenses/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      await UserService.deleteFixedExpense(user.id, id, accessToken);
      return reply.send({
        success: true,
        message: 'Expense deleted successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete expense';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  });
}
