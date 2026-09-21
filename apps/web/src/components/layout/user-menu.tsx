import { Link, useNavigate } from 'react-router-dom';

import { Icon } from '@/components/icon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/auth-provider';

function initialsOf(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || '';
  if (!source) return '?';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2)
    return ((parts[0] ?? '').charAt(0) + (parts[1] ?? '').charAt(0)).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function UserMenu() {
  const { status, profile, isModerator, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  if (status !== 'authenticated' || !profile) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to={routes.login}>Sign in</Link>
        </Button>
        <Button asChild size="sm">
          <Link to={routes.signup}>Sign up</Link>
        </Button>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate(routes.home);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
          <Avatar className="size-8">
            {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt="" />}
            <AvatarFallback>{initialsOf(profile.fullName, profile.email)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate font-medium">{profile.fullName ?? 'Your account'}</span>
          {profile.email && (
            <span className="truncate text-xs font-normal text-muted-foreground">
              {profile.email}
            </span>
          )}
          <span className="mt-1 text-xs font-normal capitalize text-muted-foreground">
            Role: {profile.role}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={routes.profile}>
            <Icon name="user" className="mr-2 size-4" aria-hidden />
            Profile &amp; settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={routes.myReports}>
            <Icon name="clipboard-list" className="mr-2 size-4" aria-hidden />
            My reports
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={routes.notifications}>
            <Icon name="bell" className="mr-2 size-4" aria-hidden />
            Notifications
          </Link>
        </DropdownMenuItem>

        {isModerator && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to={routes.moderation}>
                <Icon name="shield-check" className="mr-2 size-4" aria-hidden />
                Moderation queue
              </Link>
            </DropdownMenuItem>
          </>
        )}
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link to={routes.admin}>
              <Icon name="layout-dashboard" className="mr-2 size-4" aria-hidden />
              Admin dashboard
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void handleSignOut()}>
          <Icon name="log-out" className="mr-2 size-4" aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
