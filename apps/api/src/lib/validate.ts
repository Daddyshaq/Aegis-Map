import type { ApiErrorDetail } from '@crisis/types';
import { z, type ZodTypeAny } from 'zod';

import { badRequest } from './errors';

/**
 * Validate arbitrary input against a Zod schema, throwing a 400 on failure.
 *
 * Returns the schema's OUTPUT type (`z.output`), so fields with `.default(...)`
 * are non-optional in the result — matching how services consume parsed input.
 */
export function validate<S extends ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const details: ApiErrorDetail[] = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || undefined,
      message: issue.message,
      code: issue.code,
    }));
    throw badRequest('Validation failed', details);
  }
  return result.data;
}
