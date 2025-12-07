import type { FastifyInstance } from 'fastify';
import { AuthService } from '../services/auth.service.js';
import { signupSchema, loginSchema, refreshTokenSchema } from '../schemas/auth.schema.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../types/index.js';

export async function authRoutes(fastify: FastifyInstance) {
  // POST /auth/signup
  fastify.post('/signup', async (request, reply) => {
    const result = signupSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        details: result.error.issues,
      });
    }

    try {
      const data = await AuthService.signup(result.data);
      return reply.status(201).send({
        success: true,
        data,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signup failed';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  });

  // POST /auth/login
  fastify.post('/login', async (request, reply) => {
    const result = loginSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        details: result.error.issues,
      });
    }

    try {
      const data = await AuthService.login(result.data);
      return reply.send({
        success: true,
        data,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      return reply.status(401).send({
        success: false,
        error: message,
      });
    }
  });

  // POST /auth/logout
  fastify.post(
    '/logout',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { accessToken } = request as AuthenticatedRequest;

      try {
        await AuthService.logout(accessToken);
        return reply.send({
          success: true,
          message: 'Logged out successfully',
        });
      } catch (error) {
        return reply.send({
          success: true,
          message: 'Logged out',
        });
      }
    }
  );

  // POST /auth/refresh
  fastify.post('/refresh', async (request, reply) => {
    const result = refreshTokenSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        details: result.error.issues,
      });
    }

    try {
      const data = await AuthService.refreshToken(result.data.refresh_token);
      return reply.send({
        success: true,
        data,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token refresh failed';
      return reply.status(401).send({
        success: false,
        error: message,
      });
    }
  });

  // GET /auth/me
  fastify.get(
    '/me',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { user } = request as AuthenticatedRequest;

      try {
        const data = await AuthService.getUser(user.id);
        return reply.send({
          success: true,
          data,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get user';
        return reply.status(404).send({
          success: false,
          error: message,
        });
      }
    }
  );
}
