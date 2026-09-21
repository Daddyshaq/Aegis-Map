/** Standard API response envelopes shared by the API and the typed client. */

export interface ApiMeta {
  requestId?: string;
  pagination?: PaginationMeta;
  [key: string]: unknown;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message: string | null;
  meta: ApiMeta;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
  requestId?: string;
}

export interface ApiError {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface Paginated<T> {
  items: T[];
  pagination: PaginationMeta;
}

/** Canonical machine-readable error codes. */
export const ApiErrorCode = {
  ValidationError: 'VALIDATION_ERROR',
  Unauthorized: 'UNAUTHORIZED',
  Forbidden: 'FORBIDDEN',
  NotFound: 'NOT_FOUND',
  Conflict: 'CONFLICT',
  RateLimited: 'RATE_LIMITED',
  PayloadTooLarge: 'PAYLOAD_TOO_LARGE',
  UnsupportedMedia: 'UNSUPPORTED_MEDIA_TYPE',
  UpstreamError: 'UPSTREAM_ERROR',
  Internal: 'INTERNAL_ERROR',
  AccountSuspended: 'ACCOUNT_SUSPENDED',
} as const;
export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];
