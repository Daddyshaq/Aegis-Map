import { Icon } from '@/components/icon';
import { useOnlineStatus } from '@/hooks/use-online-status';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b bg-amber-500/90 text-amber-950 dark:bg-amber-600 dark:text-amber-50 px-3 py-1.5 text-xs font-medium backdrop-blur transition-all animate-in fade-in"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon name="wifi-off" className="size-4 shrink-0" aria-hidden />
          <span>
            <strong>Offline mode active:</strong> You are disconnected from the network. Showing
            cached crisis data and emergency guides.
          </span>
        </div>
        <span className="hidden sm:inline-block rounded bg-black/15 px-2 py-0.5 text-[11px] font-mono">
          Cached Shell
        </span>
      </div>
    </div>
  );
}
