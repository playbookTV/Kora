import type { FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../config/supabase.js';
import type { AuthUser, AuthenticatedRequest } from '../types/index.js';

export const authMiddleware = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      success: false,
      error: 'Missing or invalid authorization header',
    });
  }

  const token = authHeader.substring(7);

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    // Attach user and token to request
    (request as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email!,
      aud: user.aud,
      role: user.role!,
    } as AuthUser;
    (request as AuthenticatedRequest).accessToken = token;
  } catch (err) {
    request.log.error(err, 'Auth middleware error');
    return reply.status(401).send({
      success: false,
      error: 'Authentication failed',
    });
  }
};

// Optional auth - doesn't fail if no token, just doesn't attach user
export const optionalAuthMiddleware = async (
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> => {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return;
  }

  const token = authHeader.substring(7);

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (user) {
      (request as AuthenticatedRequest).user = {
        id: user.id,
        email: user.email!,
        aud: user.aud,
        role: user.role!,
      } as AuthUser;
      (request as AuthenticatedRequest).accessToken = token;
    }
  } catch {
    // Silently ignore auth errors for optional auth
  }
};
