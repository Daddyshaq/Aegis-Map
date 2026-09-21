import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import { Icon } from '@/components/icon';
import { Container, PageHeader } from '@/components/page';
import { RouteFallback } from '@/components/route-fallback';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

const ADMIN_NAV: { to: string; label: string; icon: string }[] = [
  { to: routes.admin, label: 'Overview', icon: 'layout-dashboard' },
  { to: routes.adminUsers, label: 'Users', icon: 'users' },
  { to: routes.adminCategories, label: 'Categories', icon: 'list' },
  { to: routes.adminAlerts, label: 'Alerts', icon: 'megaphone' },
  { to: routes.adminGuides, label: 'Guides', icon: 'book-open' },
  { to: routes.adminSettings, label: 'Settings', icon: 'settings' },
  { to: routes.adminAudit, label: 'Audit log', icon: 'clipboard-list' },
];

/**
 * Shell for the admin area: a page-level heading plus a horizontal sub-nav that
 * routes between the admin sections. Guarded by `RoleGuard{minimum:'admin'}` at
 * the router level — this component assumes the viewer is already an admin.
 */
export function AdminLayout() {
  return (
    <Container size="wide" className="py-8">
      <PageHeader
        title="Administration"
        description="Manage users, content, and system configuration for Aegis Map."
      />

      <nav aria-label="Admin sections" className="-mx-1 mb-6 overflow-x-auto">
        <ul className="flex min-w-max items-center gap-1 border-b px-1">
          {ADMIN_NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === routes.admin}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )
                }
              >
                <Icon name={item.icon} className="size-4" aria-hidden />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </Container>
  );
}

/**
 * Lightweight section header for admin sub-pages. Uses an `<h2>` (the page-level
 * `<h1>` lives in {@link AdminLayout}) and an optional actions slot.
 */
export function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
