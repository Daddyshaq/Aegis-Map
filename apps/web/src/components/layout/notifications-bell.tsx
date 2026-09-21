import { Link } from 'react-router-dom';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { useUnreadCount } from '@/hooks/use-notifications';
import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/auth-provider';

export function NotificationsBell() {
  const { isAuthenticated } = useAuth();
  const { data: count = 0 } = useUnreadCount(isAuthenticated);

  if (!isAuthenticated) return null;

  const label = count > 0 ? `Notifications, ${count} unread` : 'Notifications, none unread';

  return (
    <Button asChild variant="ghost" size="icon" className="relative" aria-label={label}>
      <Link to={routes.notifications}>
        <Icon name="bell" className="size-5" aria-hidden />
        {count > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground"
            aria-hidden
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Link>
    </Button>
  );
}
