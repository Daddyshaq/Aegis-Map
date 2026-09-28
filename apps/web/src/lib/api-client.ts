import type {
  AdminStats,
  Alert,
  ApiErrorDetail,
  ApiResponse,
  AppNotification,
  AuditLog,
  CrisisCategory,
  CrisisEvidence,
  CrisisMapFeature,
  CrisisReport,
  CrisisVerification,
  DuplicateCandidate,
  EmergencyGuide,
  GeocodeResult,
  Paginated,
  Profile,
  RouteResult,
  SafeLocation,
  SavedLocation,
  SystemSetting,
  What3WordsResult,
  What3WordsSuggestion,
} from '@crisis/types';
import type { NotificationPreferences } from '@crisis/types';
import type {
  AuditLogQueryInput,
  CreateAlertInput,
  CreateReportInput,
  CrisisCategoryInput,
  EmergencyGuideInput,
  ModerateReportInput,
  NotificationPreferencesInput,
  PushSubscriptionInput,
  RegisterEvidenceInput,
  ReportQueryInput,
  RouteRequestInput,
  SafeLocationInput,
  SafeLocationQueryInput,
  SavedLocationInput,
  SuspendUserInput,
  SystemSettingInput,
  UpdateCrisisCategoryInput,
  UpdateProfileInput,
  UpdateSafeLocationInput,
  UpdateUserRoleInput,
} from '@crisis/validation';

import { env } from './env';
import { supabase } from './supabase';

const BASE_URL = `${env.apiUrl}/api/v1`;

/**
 * Error thrown for any non-successful API interaction — HTTP error envelopes,
 * network failures, and malformed responses. Carries the machine-readable code
 * so callers (auth guard, forms, toasts) can branch without string-matching
 * messages.
 */
export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: ApiErrorDetail[];
  readonly requestId: string | undefined;

  constructor(params: {
    message: string;
    code: string;
    status: number;
    details?: ApiErrorDetail[];
    requestId?: string;
  }) {
    super(params.message);
    this.name = 'ApiClientError';
    this.code = params.code;
    this.status = params.status;
    this.details = params.details ?? [];
    this.requestId = params.requestId;
  }

  get isUnauthorized(): boolean {
    return this.status === 401 || this.code === 'UNAUTHORIZED';
  }

  get isForbidden(): boolean {
    return this.status === 403 || this.code === 'FORBIDDEN';
  }

  get isNotFound(): boolean {
    return this.status === 404 || this.code === 'NOT_FOUND';
  }

  /** Field-level validation messages keyed by field name, for form display. */
  get fieldErrors(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const detail of this.details) {
      if (detail.field) result[detail.field] = detail.message;
    }
    return result;
  }
}

type QueryValue = string | number | boolean | undefined | null;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  /** JSON body. Ignored when `formData` is provided. */
  body?: unknown;
  /** Multipart body for file uploads. */
  formData?: FormData;
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
}

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(`${BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, formData, query, signal } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = await getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload: BodyInit | undefined;
  if (formData) {
    // Let the browser set the multipart boundary Content-Type.
    payload = formData;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), { method, headers, body: payload, signal });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new ApiClientError({
      message: 'Network error — check your connection and try again.',
      code: 'NETWORK_ERROR',
      status: 0,
    });
  }

  // Parse the envelope. Some upstream/proxy errors may not be JSON.
  let parsed: ApiResponse<T> | null = null;
  const text = await response.text();
  if (text) {
    try {
      parsed = JSON.parse(text) as ApiResponse<T>;
    } catch {
      parsed = null;
    }
  }

  if (parsed && parsed.success) {
    // When the server wraps paginated collections (items in parsed.data, pagination in parsed.meta),
    // normalize into the Paginated<T> contract { items, pagination } while keeping array methods intact.
    if (parsed.meta?.pagination && Array.isArray(parsed.data)) {
      const paginatedResult = Object.assign(parsed.data, {
        items: parsed.data,
        pagination: parsed.meta.pagination,
      });
      return paginatedResult as unknown as T;
    }
    return parsed.data;
  }

  if (parsed && !parsed.success) {
    throw new ApiClientError({
      message: parsed.error.message,
      code: parsed.error.code,
      status: response.status,
      details: parsed.error.details,
      requestId: parsed.error.requestId,
    });
  }

  throw new ApiClientError({
    message: response.statusText || `Request failed with status ${response.status}`,
    code: 'INTERNAL_ERROR',
    status: response.status,
  });
}

/**
 * Typed API surface. Each method maps to exactly one backend route, returns the
 * unwrapped `data` payload, and throws `ApiClientError` on failure. There is no
 * mock data here — every call hits the real API.
 */
export const api = {
  me: {
    get: () => request<Profile>('/me'),
    updateProfile: (input: UpdateProfileInput) =>
      request<Profile>('/me/profile', { method: 'PATCH', body: input }),
    getPreferences: () => request<NotificationPreferences>('/me/preferences'),
    updatePreferences: (input: NotificationPreferencesInput) =>
      request<NotificationPreferences>('/me/preferences', { method: 'PUT', body: input }),
    listSavedLocations: () => request<SavedLocation[]>('/me/locations'),
    addSavedLocation: (input: SavedLocationInput) =>
      request<SavedLocation>('/me/locations', { method: 'POST', body: input }),
    removeSavedLocation: (id: string) =>
      request<{ id: string }>(`/me/locations/${id}`, { method: 'DELETE' }),
    getPushKey: () => request<{ publicKey: string | null }>('/me/push/key'),
    subscribePush: (input: PushSubscriptionInput) =>
      request<{ ok: true }>('/me/push/subscribe', { method: 'POST', body: input }),
    unsubscribePush: (endpoint: string) =>
      request<{ ok: true }>('/me/push/unsubscribe', { method: 'POST', body: { endpoint } }),
  },

  reports: {
    create: (input: CreateReportInput) =>
      request<CrisisReport>('/reports', { method: 'POST', body: input }),
    list: (query?: Partial<ReportQueryInput>) =>
      request<Paginated<CrisisReport>>('/reports', { query: query as Record<string, QueryValue> }),
    mine: (query?: Partial<ReportQueryInput>) =>
      request<Paginated<CrisisReport>>('/reports/mine', {
        query: query as Record<string, QueryValue>,
      }),
    checkDuplicates: (input: CreateReportInput) =>
      request<DuplicateCandidate[]>('/reports/check-duplicates', { method: 'POST', body: input }),
    get: (id: string) => request<CrisisReport>(`/reports/${id}`),
    corroborate: (id: string) =>
      request<CrisisReport>(`/reports/${id}/corroborate`, { method: 'POST' }),
    uploadEvidence: (id: string, file: File) => {
      const formData = new FormData();
      formData.append('file', file, file.name);
      return request<CrisisEvidence>(`/reports/${id}/evidence`, { method: 'POST', formData });
    },
    registerEvidence: (id: string, input: RegisterEvidenceInput) =>
      request<{ ok: true }>(`/reports/${id}/evidence/register`, { method: 'POST', body: input }),
    verifications: (id: string) => request<CrisisVerification[]>(`/reports/${id}/verifications`),
  },

  map: {
    features: (bounds: {
      minLng: number;
      minLat: number;
      maxLng: number;
      maxLat: number;
      categoryId?: string;
      minSeverity?: string;
      verifiedOnly?: boolean;
    }) => request<CrisisMapFeature[]>('/map', { query: bounds }),
  },

  categories: {
    list: (includeInactive = false) =>
      request<CrisisCategory[]>('/categories', {
        query: includeInactive ? { includeInactive: true } : undefined,
      }),
    create: (input: CrisisCategoryInput) =>
      request<CrisisCategory>('/categories', { method: 'POST', body: input }),
    update: (id: string, input: UpdateCrisisCategoryInput) =>
      request<CrisisCategory>(`/categories/${id}`, { method: 'PATCH', body: input }),
  },

  safeLocations: {
    list: (query?: Partial<SafeLocationQueryInput>) =>
      request<Paginated<SafeLocation>>('/safe-locations', {
        query: query as Record<string, QueryValue>,
      }),
    get: (id: string) => request<SafeLocation>(`/safe-locations/${id}`),
    create: (input: SafeLocationInput) =>
      request<SafeLocation>('/safe-locations', { method: 'POST', body: input }),
    update: (id: string, input: UpdateSafeLocationInput) =>
      request<SafeLocation>(`/safe-locations/${id}`, { method: 'PATCH', body: input }),
    verify: (id: string) =>
      request<SafeLocation>(`/safe-locations/${id}/verify`, { method: 'POST' }),
    remove: (id: string) => request<{ id: string }>(`/safe-locations/${id}`, { method: 'DELETE' }),
  },

  routes: {
    plan: (input: RouteRequestInput) =>
      request<{ routes: RouteResult[]; disclaimer: string }>('/routes', {
        method: 'POST',
        body: input,
      }),
  },

  alerts: {
    list: (query?: { activeOnly?: boolean; page?: number; pageSize?: number }) =>
      request<Paginated<Alert>>('/alerts', { query }),
    get: (id: string) => request<Alert>(`/alerts/${id}`),
    create: (input: CreateAlertInput) => request<Alert>('/alerts', { method: 'POST', body: input }),
    remove: (id: string) => request<{ id: string }>(`/alerts/${id}`, { method: 'DELETE' }),
  },

  notifications: {
    list: (query?: { page?: number; pageSize?: number; unreadOnly?: boolean }) =>
      request<Paginated<AppNotification>>('/notifications', { query }),
    unreadCount: () => request<{ count: number }>('/notifications/unread-count'),
    markRead: (id: string) =>
      request<{ id: string }>(`/notifications/${id}/read`, { method: 'POST' }),
    markAllRead: () => request<{ ok: true }>('/notifications/read-all', { method: 'POST' }),
  },

  moderation: {
    queue: (query?: Partial<ReportQueryInput>) =>
      request<Paginated<CrisisReport>>('/moderation/queue', {
        query: query as Record<string, QueryValue>,
      }),
    moderate: (id: string, input: ModerateReportInput) =>
      request<CrisisReport>(`/moderation/reports/${id}`, { method: 'POST', body: input }),
  },

  admin: {
    stats: () => request<AdminStats>('/admin/stats'),
    listUsers: (query?: { page?: number; pageSize?: number; q?: string; role?: string }) =>
      request<Paginated<Profile>>('/admin/users', { query }),
    setUserRole: (id: string, input: UpdateUserRoleInput) =>
      request<Profile>(`/admin/users/${id}/role`, { method: 'PATCH', body: input }),
    setUserStatus: (id: string, input: SuspendUserInput) =>
      request<Profile>(`/admin/users/${id}/status`, { method: 'PATCH', body: input }),
    listSettings: () => request<SystemSetting[]>('/admin/settings'),
    updateSetting: (key: string, input: SystemSettingInput) =>
      request<SystemSetting>(`/admin/settings/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: input,
      }),
    audit: (query?: Partial<AuditLogQueryInput>) =>
      request<Paginated<AuditLog>>('/admin/audit', {
        query: query as Record<string, QueryValue>,
      }),
    listGuides: () => request<EmergencyGuide[]>('/admin/guides'),
    createGuide: (input: EmergencyGuideInput) =>
      request<EmergencyGuide>('/admin/guides', { method: 'POST', body: input }),
    updateGuide: (id: string, input: Partial<EmergencyGuideInput>) =>
      request<EmergencyGuide>(`/admin/guides/${id}`, { method: 'PATCH', body: input }),
    removeGuide: (id: string) =>
      request<{ id: string }>(`/admin/guides/${id}`, { method: 'DELETE' }),
  },

  guides: {
    list: () => request<EmergencyGuide[]>('/guides'),
    get: (slug: string) => request<EmergencyGuide>(`/guides/${slug}`),
  },

  geo: {
    search: (q: string, limit?: number) =>
      request<GeocodeResult[]>('/geo/search', { query: { q, limit } }),
    reverse: (lat: number, lng: number) =>
      request<GeocodeResult | null>('/geo/reverse', { query: { lat, lng } }),
  },

  w3w: {
    convertToCoordinates: (words: string) =>
      request<What3WordsResult>('/w3w/convert-to-coordinates', { query: { words } }),
    convertTo3wa: (lat: number, lng: number) =>
      request<What3WordsResult>('/w3w/convert-to-3wa', { query: { lat, lng } }),
    autosuggest: (input: string) =>
      request<What3WordsSuggestion[]>('/w3w/autosuggest', { query: { input } }),
  },
};

export type ApiClient = typeof api;
