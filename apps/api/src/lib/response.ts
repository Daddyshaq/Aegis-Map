import { PAGINATION } from '@crisis/config';
import type { ApiMeta, ApiSuccess, Paginated, PaginationMeta } from '@crisis/types';

export function success<T>(
  data: T,
  message: string | null = null,
  meta: ApiMeta = {},
): ApiSuccess<T> {
  return { success: true, data, message, meta };
}

export function paginationMeta(page: number, pageSize: number, total: number): PaginationMeta {
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export function paginated<T>(
  items: T[],
  page: number,
  pageSize: number,
  total: number,
): Paginated<T> {
  return { items, pagination: paginationMeta(page, pageSize, total) };
}

/** Convert a 1-based page into a Postgres range for supabase `.range()`. */
export function pageRange(page: number, pageSize: number): { from: number; to: number } {
  const size = Math.min(Math.max(pageSize, 1), PAGINATION.maxPageSize);
  const from = (Math.max(page, 1) - 1) * size;
  return { from, to: from + size - 1 };
}
