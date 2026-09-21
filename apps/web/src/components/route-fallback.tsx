import { Spinner } from '@/components/ui/spinner';

/**
 * Fallback shown while a lazily-loaded route chunk is fetched. Route-level code
 * splitting keeps the initial bundle small — important for the low-bandwidth,
 * data-saver audience — so this appears briefly on first visit to each section.
 */
export function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-8">
      <Spinner className="size-6" label="Loading…" />
    </div>
  );
}
