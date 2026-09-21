import { Link, useLocation } from 'react-router-dom';

import { Icon } from '@/components/icon';
import { PRIMARY_NAV } from '@/components/layout/nav-items';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import { cn } from '@/lib/utils';

function isActive(pathname: string, to: string, matchPrefix?: boolean): boolean {
  if (to === '/') return pathname === '/';
  return matchPrefix ? pathname === to || pathname.startsWith(`${to}/`) : pathname === to;
}

/** Compact navigation for small screens (shown < md). */
export function MobileNav() {
  const { pathname } = useLocation();
  const { isInstallable, isInstalled, promptInstall } = usePwaInstall();

  return (
    <div className="md:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open navigation menu">
            <Icon name="menu" className="size-5" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(pathname, item.to, item.matchPrefix);
            return (
              <DropdownMenuItem key={item.to} asChild>
                <Link
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(active && 'font-semibold text-primary')}
                >
                  <Icon name={item.icon} className="mr-2 size-4" aria-hidden />
                  {item.label}
                </Link>
              </DropdownMenuItem>
            );
          })}

          {isInstallable && !isInstalled && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => void promptInstall()}
                className="cursor-pointer font-medium text-primary focus:text-primary"
              >
                <Icon name="download" className="mr-2 size-4" aria-hidden />
                Install Aegis Map
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
