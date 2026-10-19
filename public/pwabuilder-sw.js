// SweatSmart Service Worker - handles push notifications + offline caching

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Handle incoming push notifications
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'SweatSmart', body: event.data ? event.data.text() : 'New notification' };
  }

  const title = data.title || 'SweatSmart';
  const options = {
    body: data.body || data.message || "It's time to check-in 🤗",
    icon: '/192 logo.png',
    badge: '/192 logo.png',
    tag: data.tag || data.dedupKey || 'sweatsmart-notification',
    data: { url: data.url || '/' },
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      // Tell the app to play a sound if it's open
      return clients.matchAll({ type: 'window' }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({ type: 'PLAY_NOTIFICATION_SOUND', kind: data.kind || 'reminder' });
        });
      });
    })
  );
});

// Handle notification click - open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Basic offline caching
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
