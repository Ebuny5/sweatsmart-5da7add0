// Professional Service Worker for SweatSmart App - FIXED FOR ANDROID
// NOW INCLUDES: High-priority push notifications + Android support
// Version control for cache busting
const CACHE_VERSION = 'v2.5.2-android-fix';
const CACHE_NAME = `sweatsmart-${CACHE_VERSION}`;

const OFFLINE_FALLBACK_URL = '/offline.html';

// ============= INSTALL & ACTIVATE =============
self.addEventListener('install', (event) => {
  console.log('📱 SweatSmart Service Worker installed - version:', CACHE_VERSION);
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll([OFFLINE_FALLBACK_URL]);
      } catch (e) {
        console.warn('📱 SW: Failed to cache offline fallback:', e);
      }
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('📱 SweatSmart Service Worker activated - version:', CACHE_VERSION);
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('sweatsmart-') && name !== CACHE_NAME)
            .map((name) => {
              console.log('📱 Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      self.clients.claim()
    ])
  );
});

// ============= MESSAGE HANDLER =============
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'GET_VERSION') event.ports[0].postMessage({ version: CACHE_VERSION });

  if (event.data && event.data.type === 'SET_BADGE') {
    if ('setAppBadge' in self.navigator) self.navigator.setAppBadge(event.data.count || 1);
  }
  if (event.data && event.data.type === 'CLEAR_BADGE') {
    if ('clearAppBadge' in self.navigator) self.navigator.clearAppBadge();
  }

  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    await self.registration.showNotification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
      // ANDROID FIX: Always mark as user visible
      silent: false,
      requireInteraction: options?.requireInteraction !== false,
    });
  }
});

// ============= NOTIFICATION CLICK HANDLER =============
self.addEventListener('notificationclick', (event) => {
  console.log('📱 Notification clicked:', event.notification.title);
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE', url: urlToOpen });
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(urlToOpen);
    })
  );
});

// ============= NOTIFICATION CLOSE HANDLER =============
self.addEventListener('notificationclose', (event) => {
  console.log('📱 Notification dismissed:', event.notification.title);
  // Optional: Track dismissals
});

// ============= PUSH NOTIFICATIONS (CRITICAL FIX FOR ANDROID) =============
self.addEventListener('push', (event) => {
  console.log('📱 [SW] Push event received!');

  event.waitUntil(
    (async () => {
      try {
        let data = {};
        if (event.data) {
          try {
            data = event.data.json();
          } catch (e) {
            data = { title: 'SweatSmart', body: event.data.text() };
          }
        }

        const title = data.title || 'SweatSmart';
        const tag = data.tag || 'sweatsmart-push';
        const url = data.url || '/';

        // ANDROID FIX: Set proper notification options for Android
        const notificationOptions = {
          body: data.body || '',
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: tag,
          data: { url, timestamp: Date.now() },
          // CRITICAL FOR ANDROID:
          silent: false,  // Don't mute on Android
          requireInteraction: true, // Keep notification visible
          vibrate: [200, 100, 200], // Vibration pattern for Android
          actions: [
            {
              action: 'open',
              title: 'Open',
              icon: '/favicon.ico'
            },
            {
              action: 'close',
              title: 'Dismiss',
              icon: '/favicon.ico'
            }
          ]
        };

        // If it's a climate alert, set higher priority
        if (data.channel === 'climate' || data.type === 'climate') {
          notificationOptions.tag = 'sweatsmart-climate-alert';
          notificationOptions.requireInteraction = true;
          console.log('🌡️ High-priority climate alert');
        }

        await self.registration.showNotification(title, notificationOptions);
        console.log('✅ Notification shown:', title);

        // Notify open clients for audio playback (only if app is open)
        const clients = await self.clients.matchAll({ type: 'window' });
        for (const client of clients) {
          client.postMessage({ type: 'PUSH_RECEIVED', data });
          client.postMessage({
            type: 'PLAY_NOTIFICATION_SOUND',
            kind: data.type || data.kind || 'reminder',
          });
        }

      } catch (error) {
        console.error('📱 [SW] Push error:', error);
        // Fallback: show generic notification even if parsing failed
        try {
          await self.registration.showNotification('SweatSmart Alert', {
            body: 'You have a new alert',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            silent: false,
            requireInteraction: true,
          });
        } catch (e) {
          console.error('📱 [SW] Fallback notification also failed:', e);
        }
      }
    })()
  );
});

// ============= BACKGROUND SYNC (For offline reminders) =============
self.addEventListener('sync', (event) => {
  console.log('📱 [SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sweatsmart-reminder-sync') {
    event.waitUntil(
      (async () => {
        try {
          // Sync pending reminders when connection restored
          const clients = await self.clients.matchAll();
          for (const client of clients) {
            client.postMessage({
              type: 'SYNC_REMINDERS',
            });
          }
        } catch (error) {
          console.error('📱 [SW] Sync error:', error);
        }
      })()
    );
  }
});

// ============= FETCH HANDLER =============
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(event.request);
        } catch (error) {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(OFFLINE_FALLBACK_URL);
          return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
        }
      })()
    );
  }
});

console.log('📱 SweatSmart Unified Service Worker loaded - version:', CACHE_VERSION);
console.log('✅ Android notification support enabled');
