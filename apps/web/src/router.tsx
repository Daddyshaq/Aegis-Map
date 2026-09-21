import { lazy } from 'react';
import { useRoutes, type RouteObject } from 'react-router-dom';

import { AppLayout } from '@/components/layout/app-layout';
import { ProtectedRoute, RoleGuard } from '@/components/route-guards';
import { routes } from '@/lib/routes';
import { AdminLayout } from '@/pages/admin/admin-layout';

/**
 * Route-level code splitting. Pages are named exports, so each loader maps the
 * module's named component to the `default` shape `React.lazy` expects. Suspense
 * boundaries live in {@link AppLayout} and {@link AdminLayout} so the surrounding
 * chrome stays put while a chunk loads.
 */
const HomePage = lazy(() => import('@/pages/home-page').then((m) => ({ default: m.HomePage })));

// Reports
const CreateReportPage = lazy(() =>
  import('@/pages/reports/create-report-page').then((m) => ({ default: m.CreateReportPage })),
);
const MyReportsPage = lazy(() =>
  import('@/pages/reports/my-reports-page').then((m) => ({ default: m.MyReportsPage })),
);
const ReportDetailPage = lazy(() =>
  import('@/pages/reports/report-detail-page').then((m) => ({ default: m.ReportDetailPage })),
);

// Safe locations
const SafeLocationsPage = lazy(() =>
  import('@/pages/safe-locations/safe-locations-page').then((m) => ({
    default: m.SafeLocationsPage,
  })),
);
const SafeLocationDetailPage = lazy(() =>
  import('@/pages/safe-locations/safe-location-detail-page').then((m) => ({
    default: m.SafeLocationDetailPage,
  })),
);

// Routing
const RoutingPage = lazy(() =>
  import('@/pages/routing/routing-page').then((m) => ({ default: m.RoutingPage })),
);

// Guides
const GuidesPage = lazy(() =>
  import('@/pages/guides/guides-page').then((m) => ({ default: m.GuidesPage })),
);
const GuideDetailPage = lazy(() =>
  import('@/pages/guides/guide-detail-page').then((m) => ({ default: m.GuideDetailPage })),
);

// Alerts
const AlertsPage = lazy(() =>
  import('@/pages/alerts/alerts-page').then((m) => ({ default: m.AlertsPage })),
);
const AlertDetailPage = lazy(() =>
  import('@/pages/alerts/alert-detail-page').then((m) => ({ default: m.AlertDetailPage })),
);

// Notifications + profile
const NotificationsPage = lazy(() =>
  import('@/pages/notifications/notifications-page').then((m) => ({
    default: m.NotificationsPage,
  })),
);
const ProfilePage = lazy(() =>
  import('@/pages/profile/profile-page').then((m) => ({ default: m.ProfilePage })),
);

// Auth
const LoginPage = lazy(() =>
  import('@/pages/auth/login-page').then((m) => ({ default: m.LoginPage })),
);
const SignupPage = lazy(() =>
  import('@/pages/auth/signup-page').then((m) => ({ default: m.SignupPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('@/pages/auth/forgot-password-page').then((m) => ({ default: m.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import('@/pages/auth/reset-password-page').then((m) => ({ default: m.ResetPasswordPage })),
);

// Moderation
const ModerationQueuePage = lazy(() =>
  import('@/pages/moderation/moderation-queue-page').then((m) => ({
    default: m.ModerationQueuePage,
  })),
);
const ModerateReportPage = lazy(() =>
  import('@/pages/moderation/moderate-report-page').then((m) => ({
    default: m.ModerateReportPage,
  })),
);

// Admin
const AdminDashboardPage = lazy(() =>
  import('@/pages/admin/admin-dashboard-page').then((m) => ({ default: m.AdminDashboardPage })),
);
const AdminUsersPage = lazy(() =>
  import('@/pages/admin/admin-users-page').then((m) => ({ default: m.AdminUsersPage })),
);
const AdminCategoriesPage = lazy(() =>
  import('@/pages/admin/admin-categories-page').then((m) => ({ default: m.AdminCategoriesPage })),
);
const AdminAlertsPage = lazy(() =>
  import('@/pages/admin/admin-alerts-page').then((m) => ({ default: m.AdminAlertsPage })),
);
const AdminGuidesPage = lazy(() =>
  import('@/pages/admin/admin-guides-page').then((m) => ({ default: m.AdminGuidesPage })),
);
const AdminSettingsPage = lazy(() =>
  import('@/pages/admin/admin-settings-page').then((m) => ({ default: m.AdminSettingsPage })),
);
const AdminAuditPage = lazy(() =>
  import('@/pages/admin/admin-audit-page').then((m) => ({ default: m.AdminAuditPage })),
);

const NotFoundPage = lazy(() =>
  import('@/pages/not-found-page').then((m) => ({ default: m.NotFoundPage })),
);

const routeObjects: RouteObject[] = [
  // Auth pages render outside the app chrome (they use their own centered shell).
  { path: routes.login, element: <LoginPage /> },
  { path: routes.signup, element: <SignupPage /> },
  { path: routes.forgotPassword, element: <ForgotPasswordPage /> },
  { path: routes.resetPassword, element: <ResetPasswordPage /> },

  // Everything else lives inside the standard header/footer chrome.
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },

      // Public, read-only crisis information.
      { path: routes.reportDetail(), element: <ReportDetailPage /> },
      { path: routes.safeLocations, element: <SafeLocationsPage /> },
      { path: routes.safeLocationDetail(), element: <SafeLocationDetailPage /> },
      { path: routes.routing, element: <RoutingPage /> },
      { path: routes.guides, element: <GuidesPage /> },
      { path: routes.guideDetail(), element: <GuideDetailPage /> },
      { path: routes.alerts, element: <AlertsPage /> },
      { path: routes.alertDetail(), element: <AlertDetailPage /> },

      // Requires an authenticated account.
      {
        element: <ProtectedRoute />,
        children: [
          { path: routes.report, element: <CreateReportPage /> },
          { path: routes.myReports, element: <MyReportsPage /> },
          { path: routes.notifications, element: <NotificationsPage /> },
          { path: routes.profile, element: <ProfilePage /> },
        ],
      },

      // Moderators and above.
      {
        element: <RoleGuard minimum="moderator" />,
        children: [
          { path: routes.moderation, element: <ModerationQueuePage /> },
          { path: routes.moderationReport(), element: <ModerateReportPage /> },
        ],
      },

      // Administrators only.
      {
        element: <RoleGuard minimum="admin" />,
        children: [
          {
            path: routes.admin,
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminDashboardPage /> },
              { path: routes.adminUsers, element: <AdminUsersPage /> },
              { path: routes.adminCategories, element: <AdminCategoriesPage /> },
              { path: routes.adminAlerts, element: <AdminAlertsPage /> },
              { path: routes.adminGuides, element: <AdminGuidesPage /> },
              { path: routes.adminSettings, element: <AdminSettingsPage /> },
              { path: routes.adminAudit, element: <AdminAuditPage /> },
            ],
          },
        ],
      },

      // Anything unmatched, rendered within the chrome.
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

/** Renders the application's route table. Must be used within a Router. */
export function AppRoutes() {
  return useRoutes(routeObjects);
}
