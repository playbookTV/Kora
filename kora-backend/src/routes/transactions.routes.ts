import type { FastifyInstance } from 'fastify';
import { TransactionService } from '../services/transaction.service.js';
import { createTransactionSchema, transactionQuerySchema } from '../schemas/transaction.schema.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../types/index.js';

export async function transactionsRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authMiddleware);

  // GET /transactions
  fastify.get('/', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const result = transactionQuerySchema.safeParse(request.query);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        details: result.error.issues,
      });
    }

    try {
      const data = await TransactionService.getTransactions(user.id, accessToken, result.data);
      return reply.send(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get transactions';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  });

  // GET /transactions/stats
  fastify.get('/stats', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;

    try {
      const data = await TransactionService.getStats(user.id, accessToken);
      return reply.send({
        success: true,
        data,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get stats';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  });

  // GET /transactions/:id
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      const data = await TransactionService.getTransaction(user.id, id, accessToken);
      return reply.send({
        success: true,
        data,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transaction not found';
      return reply.status(404).send({
        success: false,
        error: message,
      });
    }
  });

  // POST /transactions
  fastify.post('/', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const result = createTransactionSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        details: result.error.issues,
      });
    }

    try {
      const data = await TransactionService.createTransaction(user.id, accessToken, result.data);
      return reply.status(201).send({
        success: true,
        data,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create transaction';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  });

  // DELETE /transactions/:id
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      await TransactionService.deleteTransaction(user.id, id, accessToken);
      return reply.send({
        success: true,
        message: 'Transaction deleted successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete transaction';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  });
}
