import type { AppRole } from '@crisis/types';
import { hasPermission, roleAtLeast, type Permission } from '@crisis/utils';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { forbidden, unauthorized } from '../lib/errors';

/** Require the caller to be authenticated and hold at least `role`. */
export function requireRole(role: AppRole) {
  return async function (request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    if (!request.authUser) throw unauthorized();
    if (!roleAtLeast(request.authUser.role, role)) throw forbidden();
  };
}

/** Require the caller to hold a specific fine-grained permission. */
export function requirePermission(permission: Permission) {
  return async function (request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    if (!request.authUser) throw unauthorized();
    if (!hasPermission(request.authUser.role, permission)) throw forbidden();
  };
}

export const requireModerator = requireRole('moderator');
export const requireAdmin = requireRole('admin');
