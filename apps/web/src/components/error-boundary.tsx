import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  /** Optional custom fallback renderer. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time errors so a single broken view doesn't blank the whole
 * app. Network/data errors are handled by React Query; this is the last resort.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surfaced to the console for diagnostics; no PII is logged.
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  reset = (): void => this.setState({ error: null });

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div
        role="alert"
        className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center"
      >
        <Icon name="triangle-alert" className="size-10 text-destructive" aria-hidden />
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred while rendering this page. You can try again — if it keeps
            happening, reload the app.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={this.reset}>Try again</Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      </div>
    );
  }
}
