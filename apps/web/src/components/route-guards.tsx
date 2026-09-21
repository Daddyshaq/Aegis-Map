import type { AppRole } from '@crisis/types';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/auth-provider';

function FullPageState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      {children}
    </div>
  );
}

/** Blocks access until the user is authenticated; preserves intended path. */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <FullPageState>
        <Spinner className="size-6" label="Checking your session…" />
        <p className="text-sm text-muted-foreground">Checking your session…</p>
      </FullPageState>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to={routes.login} state={{ from: location }} replace />;
  }

  return <Outlet />;
}

/** Requires a minimum role. Assumes it is nested under ProtectedRoute. */
export function RoleGuard({ minimum }: { minimum: AppRole }) {
  const { status, hasRole } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <FullPageState>
        <Spinner className="size-6" label="Checking permissions…" />
        <p className="text-sm text-muted-foreground">Checking permissions…</p>
      </FullPageState>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to={routes.login} state={{ from: location }} replace />;
  }

  if (!hasRole(minimum)) {
    return (
      <FullPageState>
        <Icon name="shield-alert" className="size-10 text-muted-foreground" aria-hidden />
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Access restricted</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            You don&apos;t have permission to view this page. If you believe this is a mistake,
            contact an administrator.
          </p>
        </div>
        <Button asChild variant="outline">
          <a href={routes.home}>Back to safety</a>
        </Button>
      </FullPageState>
    );
  }

  return <Outlet />;
}
