import { Icon } from '@/components/icon';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  className?: string;
  label?: string;
}

/** Accessible loading indicator. Announces `label` to screen readers. */
export function Spinner({ className, label = 'Loading' }: SpinnerProps) {
  return (
    <span role="status" className="inline-flex items-center gap-2">
      <Icon name="loader" className={cn('animate-spin text-muted-foreground', className)} />
      <span className="sr-only">{label}</span>
    </span>
  );
}
