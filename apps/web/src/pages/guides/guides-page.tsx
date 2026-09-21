import { Link } from 'react-router-dom';

import { EmptyState, ErrorState } from '@/components/data-states';
import { Icon } from '@/components/icon';
import { Container, PageHeader } from '@/components/page';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGuides } from '@/hooks/use-guides';
import { routes } from '@/lib/routes';

export function GuidesPage() {
  const { data: guides, isLoading, isError, error, refetch } = useGuides();

  return (
    <Container className="py-8">
      <PageHeader
        title="Emergency guides"
        description="Practical, reviewed guidance for staying safe before, during, and after an emergency."
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !guides || guides.length === 0 ? (
        <EmptyState
          icon="book-open"
          title="No guides published yet"
          description="Emergency guides will appear here once they are published."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {guides.map((guide) => (
            <Card key={guide.id} className="transition-colors hover:border-primary/40">
              <CardContent className="p-5">
                <Link to={routes.guideDetail(guide.slug)} className="group flex items-start gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon name={guide.icon} className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-semibold leading-snug group-hover:underline">
                      {guide.title}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {guide.summary}
                    </p>
                  </div>
                  <Icon
                    name="chevron-right"
                    className="ml-auto mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}
