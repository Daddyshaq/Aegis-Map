import { ROLE_RANK, type AppRole } from '@crisis/types';

/**
 * Server-authoritative access-control matrix. The frontend uses the same data
 * to hide controls, but every entry here is also enforced by the API and RLS.
 */
export type Permission =
  | 'map:view'
  | 'report:create'
  | 'report:read_own'
  | 'report:read_all'
  | 'report:verify'
  | 'moderation:act'
  | 'moderation:view_queue'
  | 'alert:create'
  | 'alert:manage'
  | 'safe_location:suggest'
  | 'safe_location:manage'
  | 'category:manage'
  | 'user:manage'
  | 'user:suspend'
  | 'moderator:manage'
  | 'audit:view'
  | 'analytics:view'
  | 'settings:manage'
  | 'guide:manage';

const MATRIX: Record<AppRole, Permission[]> = {
  citizen: ['map:view', 'report:create', 'report:read_own', 'safe_location:suggest'],
  moderator: [
    'map:view',
    'report:create',
    'report:read_own',
    'report:read_all',
    'report:verify',
    'moderation:act',
    'moderation:view_queue',
    'alert:create',
    'safe_location:suggest',
    'safe_location:manage',
    'audit:view',
    'analytics:view',
  ],
  admin: [
    'map:view',
    'report:create',
    'report:read_own',
    'report:read_all',
    'report:verify',
    'moderation:act',
    'moderation:view_queue',
    'alert:create',
    'alert:manage',
    'safe_location:suggest',
    'safe_location:manage',
    'category:manage',
    'user:manage',
    'user:suspend',
    'moderator:manage',
    'audit:view',
    'analytics:view',
    'settings:manage',
    'guide:manage',
  ],
};

export function permissionsFor(role: AppRole): Permission[] {
  return MATRIX[role] ?? [];
}

export function hasPermission(role: AppRole, permission: Permission): boolean {
  return MATRIX[role]?.includes(permission) ?? false;
}

/** True when `role` is at least as privileged as `required`. */
export function roleAtLeast(role: AppRole, required: AppRole): boolean {
  return (ROLE_RANK[role] ?? -1) >= (ROLE_RANK[required] ?? Number.MAX_SAFE_INTEGER);
}

export function isModerator(role: AppRole): boolean {
  return roleAtLeast(role, 'moderator');
}

export function isAdmin(role: AppRole): boolean {
  return role === 'admin';
}
