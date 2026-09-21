import type { PaginationMeta } from '@crisis/types';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';

/** Simple prev/next pager driven by API pagination metadata. */
export function Pagination({
  pagination,
  onPageChange,
}: {
  pagination: PaginationMeta | undefined;
  onPageChange: (page: number) => void;
}) {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, total, hasPrev, hasNext } = pagination;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 pt-4 text-sm">
      <p className="text-muted-foreground" aria-live="polite">
        Page {page} of {totalPages} · {total} total
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrev}
          onClick={() => onPageChange(page - 1)}
        >
          <Icon name="chevron-left" className="mr-1 size-4" aria-hidden />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <Icon name="chevron-right" className="ml-1 size-4" aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
