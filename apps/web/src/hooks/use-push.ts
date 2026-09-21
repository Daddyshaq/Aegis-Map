import { useCallback, useEffect, useState } from 'react';

import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/errors';
import { isPushSupported, serializeSubscription, urlBase64ToUint8Array } from '@/lib/push';

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

interface UsePushResult {
  supported: boolean;
  permission: PermissionState;
  isSubscribed: boolean;
  isBusy: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

/**
 * Manages the browser's Web Push subscription lifecycle and mirrors it to the
 * server. The server holds the VAPID public key (fetched per-session) so no key
 * material is baked into the bundle.
 */
export function usePush(): UsePushResult {
  const supported = isPushSupported();
  const [permission, setPermission] = useState<PermissionState>(
    supported ? Notification.permission : 'unsupported',
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  // Reflect any existing subscription on mount.
  useEffect(() => {
    if (!supported) return;
    let active = true;
    void navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (active) setIsSubscribed(!!sub);
      })
      .catch(() => {
        /* no registration yet */
      });
    return () => {
      active = false;
    };
  }, [supported]);

  const subscribe = useCallback(async () => {
    if (!supported) {
      toast.error('Push notifications are not supported on this device.');
      return;
    }
    setIsBusy(true);
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== 'granted') {
        toast.error('Notification permission was denied.');
        return;
      }

      const { publicKey } = await api.me.getPushKey();
      if (!publicKey) {
        toast.error('Push notifications are not configured on the server.');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      await api.me.subscribePush(serializeSubscription(subscription));
      setIsSubscribed(true);
      toast.success('Push notifications enabled.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not enable push notifications.'));
    } finally {
      setIsBusy(false);
    }
  }, [supported]);

  const unsubscribe = useCallback(async () => {
    if (!supported) return;
    setIsBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await api.me.unsubscribePush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
      toast.success('Push notifications disabled.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not disable push notifications.'));
    } finally {
      setIsBusy(false);
    }
  }, [supported]);

  return { supported, permission, isSubscribed, isBusy, subscribe, unsubscribe };
}
