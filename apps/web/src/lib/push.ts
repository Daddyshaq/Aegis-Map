/** Web Push helpers shared by the push subscription hook and the UI. */

/** VAPID keys are base64url; the browser needs a Uint8Array. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Shape produced by PushSubscription.toJSON(). We narrow it to what the API
 * validation (`pushSubscriptionSchema`) requires.
 */
export interface SerializedPushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
}

export function serializeSubscription(sub: PushSubscription): SerializedPushSubscription {
  const json = sub.toJSON();
  const keys = json.keys ?? {};
  return {
    endpoint: sub.endpoint,
    expirationTime: sub.expirationTime ?? null,
    keys: { p256dh: keys.p256dh ?? '', auth: keys.auth ?? '' },
  };
}
