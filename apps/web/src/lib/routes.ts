/**
 * Central route path definitions. Using helpers (rather than string literals
 * scattered across the app) keeps links and navigation in sync.
 */
export const routes = {
  home: '/',
  report: '/report',
  reportDetail: (id = ':id') => `/reports/${id}`,
  myReports: '/my-reports',
  safeLocations: '/safe-locations',
  safeLocationDetail: (id = ':id') => `/safe-locations/${id}`,
  routing: '/routes',
  guides: '/guides',
  guideDetail: (slug = ':slug') => `/guides/${slug}`,
  alerts: '/alerts',
  alertDetail: (id = ':id') => `/alerts/${id}`,
  notifications: '/notifications',
  profile: '/profile',

  // Auth
  login: '/login',
  signup: '/signup',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',

  // Moderation
  moderation: '/moderation',
  moderationReport: (id = ':id') => `/moderation/reports/${id}`,

  // Admin
  admin: '/admin',
  adminUsers: '/admin/users',
  adminCategories: '/admin/categories',
  adminAlerts: '/admin/alerts',
  adminGuides: '/admin/guides',
  adminSettings: '/admin/settings',
  adminAudit: '/admin/audit',
} as const;
