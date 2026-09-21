import { useState } from 'react';

import { Icon } from '@/components/icon';
import { IosInstallDialog } from '@/components/pwa/ios-install-dialog';
import { Button } from '@/components/ui/button';
import { usePwaInstall } from '@/hooks/use-pwa-install';

export function InstallPromptBanner() {
  const {
    isInstallable,
    isInstalled,
    isDismissed,
    showIOSGuide,
    setShowIOSGuide,
    promptInstall,
    dismissPrompt,
  } = usePwaInstall();

  const [isInstalling, setIsInstalling] = useState(false);

  if (isInstalled || isDismissed || !isInstallable) {
    return (
      <IosInstallDialog open={showIOSGuide} onOpenChange={setShowIOSGuide} />
    );
  }

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      await promptInstall();
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <>
      <aside
        aria-label="Install App Prompt"
        className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-lg rounded-xl border bg-background/95 p-4 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-background/90 transition-all animate-in fade-in slide-in-from-bottom-5 duration-300"
      >
        <div className="flex items-start gap-3.5">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-slate-900 shadow-md">
            <img
              src="/icons/icon-192.png"
              alt=""
              className="size-full object-cover"
              aria-hidden
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-sm leading-tight text-foreground">
                Install Aegis Map
              </h2>
              <button
                type="button"
                onClick={dismissPrompt}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                aria-label="Dismiss installation prompt"
              >
                <Icon name="x" className="size-4" aria-hidden />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-normal">
              Install our official mobile app for instant one-tap crisis reporting, offline maps, and
              live disaster alerts.
            </p>

            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                className="h-8 text-xs font-semibold shadow-sm"
                onClick={handleInstallClick}
                disabled={isInstalling}
              >
                {isInstalling ? (
                  <Icon name="loader" className="mr-1.5 size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Icon name="download" className="mr-1.5 size-3.5" aria-hidden />
                )}
                Install App
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                onClick={dismissPrompt}
              >
                Not now
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <IosInstallDialog open={showIOSGuide} onOpenChange={setShowIOSGuide} />
    </>
  );
}
