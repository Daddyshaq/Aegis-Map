import { APP_NAME } from '@crisis/config';
import { Link, NavLink } from 'react-router-dom';

import { Icon } from '@/components/icon';
import { MobileNav } from '@/components/layout/mobile-nav';
import { PRIMARY_NAV } from '@/components/layout/nav-items';
import { NotificationsBell } from '@/components/layout/notifications-bell';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { UserMenu } from '@/components/layout/user-menu';
import { Button } from '@/components/ui/button';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

export function Header() {
  const { isInstallable, isInstalled, promptInstall } = usePwaInstall();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4">
        <MobileNav />

        <Link to={routes.home} className="flex items-center gap-2 font-semibold">
          <Icon name="shield" className="size-6 text-primary" aria-hidden />
          <span className="hidden sm:inline">{APP_NAME}</span>
        </Link>

        <nav aria-label="Primary" className="ml-4 hidden md:block">
          <ul className="flex items-center gap-1">
            {PRIMARY_NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === routes.home}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
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

        <div className="ml-auto flex items-center gap-1.5">
          {isInstallable && !isInstalled && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10"
              onClick={() => void promptInstall()}
            >
              <Icon name="download" className="size-3.5" aria-hidden />
              <span>Install</span>
            </Button>
          )}
          <NotificationsBell />
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
