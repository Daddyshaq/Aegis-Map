import { Link, useParams } from 'react-router-dom';

import { ErrorState } from '@/components/data-states';
import { Icon } from '@/components/icon';
import { Markdown } from '@/components/markdown';
import { Container } from '@/components/page';
import { Skeleton } from '@/components/ui/skeleton';
import { useGuide } from '@/hooks/use-guides';
import { formatDateTime } from '@/lib/format';
import { routes } from '@/lib/routes';

export function GuideDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: guide, isLoading, isError, error, refetch } = useGuide(slug);

  return (
    <Container size="narrow" className="py-8">
      <Link
        to={routes.guides}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <Icon name="arrow-left" className="size-4" aria-hidden />
        All guides
      </Link>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError || !guide ? (
        <ErrorState error={error} title="Guide unavailable" onRetry={() => void refetch()} />
      ) : (
        <article>
          <div className="mb-6 flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Icon name={guide.icon} className="size-6" aria-hidden />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{guide.title}</h1>
              <p className="mt-1 text-muted-foreground">{guide.summary}</p>
            </div>
          </div>

          <Markdown content={guide.content} />

          <p className="mt-8 border-t pt-4 text-xs text-muted-foreground">
            Last updated {formatDateTime(guide.updatedAt)}. This guidance is informational and does
            not replace instructions from official emergency services.
          </p>
        </article>
      )}
    </Container>
  );
}
