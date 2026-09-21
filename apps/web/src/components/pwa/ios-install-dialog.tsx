import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface IosInstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IosInstallDialog({ open, onOpenChange }: IosInstallDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-slate-900 p-2 shadow-md">
            <img
              src="/icons/icon-192.png"
              alt="Aegis Map"
              className="size-full rounded-xl object-contain"
            />
          </div>
          <DialogTitle className="text-center text-lg">
            Install Aegis Map on your iPhone
          </DialogTitle>
          <DialogDescription className="text-center">
            Install Aegis Map as a native app on your home screen for one-tap emergency access and
            offline maps.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3 text-sm">
          <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
            <div className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
              1
            </div>
            <div>
              <p className="font-medium text-foreground">Tap the Share button</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                In Safari&apos;s bottom toolbar, tap the Share icon{' '}
                <span className="inline-flex items-center justify-center rounded border bg-background px-1.5 py-0.5 text-[10px] font-mono">
                  ⎋ / Share
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
            <div className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
              2
            </div>
            <div>
              <p className="font-medium text-foreground">Select &ldquo;Add to Home Screen&rdquo;</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                Scroll down the share options and tap{' '}
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <Icon name="plus" className="size-3" aria-hidden /> Add to Home Screen
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
            <div className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
              3
            </div>
            <div>
              <p className="font-medium text-foreground">Tap &ldquo;Add&rdquo;</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Confirm by tapping <strong>Add</strong> in the top-right corner.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
