import { ApiErrorCode, type ApiError } from '@crisis/types';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';

import { isProd } from '../config/env';
import { AppError } from '../lib/errors';

/**
 * Central error handler. Produces the standard error envelope, attaches a
 * request id, logs full detail server-side, and never leaks stack traces or
 * internal messages to clients in production.
 */
export const errorHandlerPlugin = fp(async (fastify) => {
  fastify.setNotFoundHandler((request, reply) => {
    const body: ApiError = {
      success: false,
      error: {
        code: ApiErrorCode.NotFound,
        message: `Route ${request.method} ${request.url} not found`,
        requestId: request.id,
      },
    };
    reply.status(404).send(body);
  });

  fastify.setErrorHandler((error, request, reply) => {
    // Known application errors — safe to surface.
    if (error instanceof AppError) {
      if (error.statusCode >= 500) request.log.error({ err: error }, 'Application error');
      const body: ApiError = {
        success: false,
        error: {
          code: error.code,
          message: error.expose ? error.message : 'An unexpected error occurred',
          details: error.details,
          requestId: request.id,
        },
      };
      return reply.status(error.statusCode).send(body);
    }

    // Zod validation errors.
    if (error instanceof ZodError) {
      const body: ApiError = {
        success: false,
        error: {
          code: ApiErrorCode.ValidationError,
          message: 'Validation failed',
          details: error.issues.map((i) => ({
            field: i.path.join('.') || undefined,
            message: i.message,
            code: i.code,
          })),
          requestId: request.id,
        },
      };
      return reply.status(400).send(body);
    }

    // Fastify built-ins (rate limit, payload too large, unsupported media...).
    const statusCode = error.statusCode ?? 500;
    if (statusCode < 500) {
      const code =
        statusCode === 429
          ? ApiErrorCode.RateLimited
          : statusCode === 413
            ? ApiErrorCode.PayloadTooLarge
            : statusCode === 415
              ? ApiErrorCode.UnsupportedMedia
              : ApiErrorCode.ValidationError;
      const body: ApiError = {
        success: false,
        error: { code, message: error.message, requestId: request.id },
      };
      return reply.status(statusCode).send(body);
    }

    // Unknown/internal — log everything, reveal nothing.
    request.log.error({ err: error }, 'Unhandled error');
    const body: ApiError = {
      success: false,
      error: {
        code: ApiErrorCode.Internal,
        message: isProd ? 'An internal error occurred' : error.message,
        requestId: request.id,
      },
    };
    return reply.status(500).send(body);
  });
});
