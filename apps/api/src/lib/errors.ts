import { ApiErrorCode, type ApiErrorDetail } from '@crisis/types';

/**
 * Application error carrying an HTTP status, a stable machine code and optional
 * field-level details. Thrown by services/routes and translated to a safe JSON
 * envelope by the central error handler.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: ApiErrorDetail[];
  /** When true, the message is safe to show end users (default true for 4xx). */
  readonly expose: boolean;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    options?: { details?: ApiErrorDetail[]; expose?: boolean },
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = options?.details;
    this.expose = options?.expose ?? statusCode < 500;
  }
}

export const badRequest = (message: string, details?: ApiErrorDetail[]) =>
  new AppError(400, ApiErrorCode.ValidationError, message, { details });

export const unauthorized = (message = 'Authentication required') =>
  new AppError(401, ApiErrorCode.Unauthorized, message);

export const forbidden = (message = 'You do not have permission to do that') =>
  new AppError(403, ApiErrorCode.Forbidden, message);

export const notFound = (message = 'Resource not found') =>
  new AppError(404, ApiErrorCode.NotFound, message);

export const conflict = (message: string, details?: ApiErrorDetail[]) =>
  new AppError(409, ApiErrorCode.Conflict, message, { details });

export const tooManyRequests = (message = 'Too many requests') =>
  new AppError(429, ApiErrorCode.RateLimited, message);

export const upstreamError = (message = 'An upstream service failed') =>
  new AppError(502, ApiErrorCode.UpstreamError, message);

export const accountSuspended = (message = 'This account is suspended') =>
  new AppError(403, ApiErrorCode.AccountSuspended, message);
