import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';

export const errorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void => {
  request.log.error(error);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    reply.status(400).send({
      success: false,
      error: 'Validation error',
      details: error.issues.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Handle Fastify validation errors
  if (error.validation) {
    reply.status(400).send({
      success: false,
      error: 'Validation error',
      details: error.validation,
    });
    return;
  }

  // Handle known HTTP errors
  if (error.statusCode) {
    reply.status(error.statusCode).send({
      success: false,
      error: error.message,
    });
    return;
  }

  // Handle unknown errors
  reply.status(500).send({
    success: false,
    error: 'Internal server error',
  });
};

// Not found handler
export const notFoundHandler = (
  request: FastifyRequest,
  reply: FastifyReply
): void => {
  reply.status(404).send({
    success: false,
    error: `Route ${request.method} ${request.url} not found`,
  });
};
