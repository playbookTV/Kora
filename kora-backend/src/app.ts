import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { registerRoutes } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';

export const buildApp = async () => {
  const fastify = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport:
        env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
  });

  // Register plugins
  await fastify.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    credentials: true,
  });

  await fastify.register(multipart, {
    limits: {
      fileSize: 25 * 1024 * 1024, // 25MB max for audio files
    },
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    // Higher limits for AI endpoints
    keyGenerator: (request) => {
      return request.ip;
    },
  });

  // Error handlers
  fastify.setErrorHandler(errorHandler);
  fastify.setNotFoundHandler(notFoundHandler);

  // Register routes
  await registerRoutes(fastify);

  return fastify;
};
