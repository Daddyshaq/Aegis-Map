import { APP_NAME } from '@crisis/config';
import { Link } from 'react-router-dom';

import { Icon } from '@/components/icon';
import { routes } from '@/lib/routes';

/** Centered card shell shared by all authentication screens. */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-10 sm:py-16">
      <Link to={routes.home} className="mx-auto mb-6 inline-flex items-center gap-2 font-semibold">
        <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Icon name="shield" className="size-5" aria-hidden />
        </span>
        <span className="text-lg">{APP_NAME}</span>
      </Link>

      <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 space-y-1.5 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {children}
      </div>

      {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
    </div>
  );
}
