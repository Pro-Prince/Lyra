const CACHE_NAME = 'lyra-vrm-cache-v6';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Cache-First for 3D model assets only when they are verified binary models
  if (url.pathname.endsWith('.vrm') || url.pathname.includes('/models/')) {
    e.respondWith(
      (async () => {
        try {
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(e.request);
          if (cachedResponse) {
            const contentType = (cachedResponse.headers.get('content-type') || '').toLowerCase();
            // Sanity check: Ensure cached response is valid binary, not HTML error/SPA fallback
            if (!contentType.includes('text/html')) {
              return cachedResponse;
            }
            // If corrupt HTML response was stored, delete it immediately
            await cache.delete(e.request);
          }

          const networkResponse = await fetch(e.request);
          if (networkResponse.ok) {
            const contentType = (networkResponse.headers.get('content-type') || '').toLowerCase();
            if (!contentType.includes('text/html')) {
              cache.put(e.request, networkResponse.clone());
            }
          }
          return networkResponse;
        } catch (err) {
          const cache = await caches.open(CACHE_NAME);
          const fallback = await cache.match(e.request);
          if (fallback) return fallback;
          return Response.error();
        }
      })()
    );
    return;
  }
  // Pass through everything else
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      if (windowClients.length > 0) {
        let client = windowClients[0];
        for (let i = 0; i < windowClients.length; i++) {
          if (windowClients[i].focused) {
            client = windowClients[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
