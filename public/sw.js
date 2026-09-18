const CACHE_NAME = 'voltera-cache-v4';
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/screenshot-mobile.png',
  '/screenshot-desktop.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[Service Worker] Pre-cache warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bypass dev server hot-reload websocket and vite internal requests
  if (url.pathname.startsWith('/@') || url.pathname.includes('hot-update')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // If it's a navigation request, serve cached homepage / index
        if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
          const fallback = await caches.match('/') || await caches.match('/manifest.json');
          if (fallback) return fallback;
        }
        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable (Offline)'
        });
      })
  );
});

// Periodic Background Sync Listener
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-data' || event.tag === 'update-readings' || event.tag === 'daily-summary') {
    event.waitUntil(
      (async () => {
        try {
          console.log(`[Service Worker] Executing Periodic Background Sync for tag: ${event.tag}`);
          // Fetch updated readings or summary data in background
          const response = await fetch('/api/widget-data');
          if (response.ok) {
            const data = await response.json();
            const cache = await caches.open(CACHE_NAME);
            await cache.put('/api/widget-data', new Response(JSON.stringify(data)));
          }
        } catch (error) {
          console.error('[Service Worker] Periodic Sync failed:', error);
        }
      })()
    );
  }
});

// One-shot Background Sync Listener (One-Off Deferment)
self.addEventListener('sync', (event) => {
  console.log(`[Service Worker] Background Sync triggered for tag: ${event.tag}`);
  if (event.tag.startsWith('sync-') || event.tag === 'sync-offline-payments' || event.tag === 'sync-pending-data') {
    event.waitUntil(
      (async () => {
        try {
          // Notify active client windows that background sync is processing
          const allClients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
          for (const client of allClients) {
            client.postMessage({
              type: 'BACKGROUND_SYNC_TRIGGERED',
              tag: event.tag,
              timestamp: Date.now()
            });
          }
          console.log(`[Service Worker] Background Sync '${event.tag}' completed successfully.`);
        } catch (error) {
          console.error(`[Service Worker] Background Sync '${event.tag}' failed:`, error);
          throw error; // Re-throw to signal to browser to retry sync when network is stable
        }
      })()
    );
  }
});

// Web Push Notification Event Listener
self.addEventListener('push', (event) => {
  let data = { title: 'فولترا - إشعار جديد', body: 'تحديث جديد متاح في محطة الكهرباء الخاص بك.', url: '/' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'تحديث جديد متاح.',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    data: {
      url: data.url || '/'
    },
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'عرض التفاصيل' },
      { action: 'close', title: 'إغلاق' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'فولترا', options)
  );
});

// Notification Click Listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

