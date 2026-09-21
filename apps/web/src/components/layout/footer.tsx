import { APP_NAME, APP_TAGLINE } from '@crisis/config';
import { Link } from 'react-router-dom';

import { Icon } from '@/components/icon';
import { routes } from '@/lib/routes';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <Icon name="shield" className="size-5 text-primary" aria-hidden />
              {APP_NAME}
            </div>
            <p className="text-sm text-muted-foreground">{APP_TAGLINE}</p>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold">Explore</h2>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                <Link to={routes.home} className="hover:text-foreground hover:underline">
                  Live map
                </Link>
              </li>
              <li>
                <Link to={routes.safeLocations} className="hover:text-foreground hover:underline">
                  Safe locations
                </Link>
              </li>
              <li>
                <Link to={routes.routing} className="hover:text-foreground hover:underline">
                  Safe routes
                </Link>
              </li>
              <li>
                <Link to={routes.alerts} className="hover:text-foreground hover:underline">
                  Alerts
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold">Prepare</h2>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                <Link to={routes.guides} className="hover:text-foreground hover:underline">
                  Emergency guides
                </Link>
              </li>
              <li>
                <Link to={routes.report} className="hover:text-foreground hover:underline">
                  Report a crisis
                </Link>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
              <Icon name="phone" className="size-4" aria-hidden />
              In an emergency
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Call your local emergency number immediately — <strong>112</strong> (national
              toll-free line in Nigeria). {APP_NAME} is a community information tool and does not
              replace official emergency services.
            </p>
          </div>
        </div>

        <div className="mt-8 border-t pt-4 text-xs text-muted-foreground">
          <p>
            © {year} {APP_NAME}. Crisis and routing information is community-sourced and may be
            incomplete or inaccurate. No route or location is guaranteed to be safe — always use
            your own judgement.
          </p>
        </div>
      </div>
    </footer>
  );
}
