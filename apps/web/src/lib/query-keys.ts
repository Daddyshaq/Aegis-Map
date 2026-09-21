import type {
  AuditLogQueryInput,
  ReportQueryInput,
  SafeLocationQueryInput,
} from '@crisis/validation';

type Json = object | undefined;

/**
 * Central React Query key factory. Using one place for keys keeps
 * invalidations (including Realtime-driven ones) consistent across the app.
 */
export const queryKeys = {
  me: ['me'] as const,
  preferences: ['preferences'] as const,
  savedLocations: ['saved-locations'] as const,
  pushKey: ['push-key'] as const,

  reports: {
    all: ['reports'] as const,
    list: (params?: Partial<ReportQueryInput>) => ['reports', 'list', params ?? {}] as const,
    mine: (params?: Partial<ReportQueryInput>) => ['reports', 'mine', params ?? {}] as const,
    detail: (id: string) => ['reports', 'detail', id] as const,
    verifications: (id: string) => ['reports', 'verifications', id] as const,
  },

  map: (bounds: Json) => ['map', bounds ?? {}] as const,

  categories: (includeInactive?: boolean) => ['categories', includeInactive ?? false] as const,

  safeLocations: {
    all: ['safe-locations'] as const,
    list: (params?: Partial<SafeLocationQueryInput>) =>
      ['safe-locations', 'list', params ?? {}] as const,
    detail: (id: string) => ['safe-locations', 'detail', id] as const,
  },

  alerts: {
    all: ['alerts'] as const,
    list: (params?: Json) => ['alerts', 'list', params ?? {}] as const,
    detail: (id: string) => ['alerts', 'detail', id] as const,
  },

  notifications: {
    all: ['notifications'] as const,
    list: (params?: Json) => ['notifications', 'list', params ?? {}] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },

  moderationQueue: (params?: Partial<ReportQueryInput>) =>
    ['moderation', 'queue', params ?? {}] as const,

  admin: {
    stats: ['admin', 'stats'] as const,
    users: (params?: Json) => ['admin', 'users', params ?? {}] as const,
    settings: ['admin', 'settings'] as const,
    audit: (params?: Partial<AuditLogQueryInput>) => ['admin', 'audit', params ?? {}] as const,
    guides: ['admin', 'guides'] as const,
  },

  guides: {
    all: ['guides'] as const,
    detail: (slug: string) => ['guides', 'detail', slug] as const,
  },

  geo: (query: string) => ['geo', query] as const,

  w3w: {
    words: (lat: number, lng: number) => ['w3w', 'coords', lat, lng] as const,
    coords: (words: string) => ['w3w', 'words', words] as const,
    suggest: (input: string) => ['w3w', 'suggest', input] as const,
  },
} as const;
