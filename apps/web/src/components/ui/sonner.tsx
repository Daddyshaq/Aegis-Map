import { Toaster as Sonner } from 'sonner';

import { useTheme } from '@/providers/theme-provider';

export { toast } from 'sonner';

/** App toaster. Mirrors the active theme and uses rich colours so success /
 * error / warning toasts are distinguishable by more than colour. */
export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme}
      position="top-right"
      richColors
      closeButton
      toastOptions={{ duration: 5000 }}
    />
  );
}
