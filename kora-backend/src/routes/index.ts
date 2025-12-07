import type { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.routes.js';
import { usersRoutes } from './users.routes.js';
import { transactionsRoutes } from './transactions.routes.js';
import { aiRoutes } from './ai.routes.js';

export async function registerRoutes(fastify: FastifyInstance) {
  // Health check
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  // API version info
  fastify.get('/', async () => ({
    name: 'Kora API',
    version: '1.0.0',
    description: 'Backend API for Kora - Voice-first personal finance app',
  }));

  // Register route modules with prefixes
  await fastify.register(authRoutes, { prefix: '/auth' });
  await fastify.register(usersRoutes, { prefix: '/users' });
  await fastify.register(transactionsRoutes, { prefix: '/transactions' });
  await fastify.register(aiRoutes, { prefix: '/ai' });
}
