/// <reference lib="webworker" />

/**
 * Custom service worker compiled by vite-plugin-pwa's `injectManifest`
 * strategy. Responsibilities:
 *   1. Precache the built app shell (list injected at `self.__WB_MANIFEST`).
 *   2. Serve navigations network-first, falling back to the cached shell and
 *      then an offline page — so the installed PWA opens without a network.
 *   3. Serve precached static assets cache-first.
 *   4. Receive Web Push messages and display notifications.
 *   5. Focus/open the app when a notification is clicked.
 *
 * It intentionally avoids the workbox runtime packages: precaching is done by
 * hand so the only build-time dependency is the manifest injection point.
 */

export type {};

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

const VERSION = 'v1';
const PRECACHE = `aegis-precache-${VERSION}`;
const RUNTIME = `aegis-runtime-${VERSION}`;
const OFFLINE_URL = '/offline.html';

// The manifest is injected at build time; reference it so injection succeeds.
const PRECACHE_ENTRIES = self.__WB_MANIFEST ?? [];
const PRECACHE_URLS = new Set<string>([
  OFFLINE_URL,
  ...PRECACHE_ENTRIES.map((entry) => new URL(entry.url, self.location.origin).pathname),
]);

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      const urls = [OFFLINE_URL, ...PRECACHE_ENTRIES.map((entry) => entry.url)];
      // Cache individually so one failed asset doesn't abort the whole install.
      await Promise.all(
        urls.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined)),
      );
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== PRECACHE && key !== RUNTIME).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

// Allow the page to trigger an immediate activation when the user accepts an update.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

function isPrecached(pathname: string): boolean {
  return PRECACHE_URLS.has(pathname);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept API or cross-origin calls — always hit the network so the
  // app never serves stale crisis data as if it were live.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api')) return;

  // Navigations: network-first, fall back to the app shell, then offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          return response;
        } catch {
          const cache = await caches.open(PRECACHE);
          return (
            (await cache.match('/index.html')) ??
            (await cache.match('index.html')) ??
            (await cache.match('/')) ??
            (await cache.match(OFFLINE_URL)) ??
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  // Precached static assets: cache-first.
  if (isPrecached(url.pathname)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return fetch(request);
      })(),
    );
    return;
  }

  // Other same-origin assets (fonts, map glyphs, images): stale-while-revalidate.
  event.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME);
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) void cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached ?? Response.error());
      return cached ?? network;
    })(),
  );
});

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

self.addEventListener('push', (event) => {
  const payload: PushPayload = (() => {
    if (!event.data) return {};
    try {
      return event.data.json() as PushPayload;
    } catch {
      return { body: event.data.text() };
    }
  })();

  const title = payload.title ?? 'Aegis Map';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/favicon-32x32.png',
      tag: payload.tag,
      data: { url: payload.url ?? '/', ...payload.data },
      requireInteraction: false,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = (event.notification.data ?? {}) as { url?: string };
  const targetUrl = new URL(data.url ?? '/', self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client && client.url !== targetUrl) {
            await client.navigate(targetUrl).catch(() => undefined);
          }
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
