import { Link } from 'react-router-dom';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { routes } from '@/lib/routes';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon name="map-pinned" className="size-8" aria-hidden />
      </span>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-2 text-muted-foreground">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to={routes.home}>
            <Icon name="map" className="mr-2 size-4" aria-hidden />
            Back to the map
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={routes.guides}>Emergency guides</Link>
        </Button>
      </div>
    </div>
  );
}
