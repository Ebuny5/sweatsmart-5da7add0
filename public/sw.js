// Professional Service Worker for SweatSmart App - FIXED FOR ANDROID
// NOW INCLUDES: High-priority push notifications + Android support
// Version control for cache busting
const CACHE_VERSION = 'v2.6.2-eight-hour-reminder-fix';
const CACHE_NAME = `sweatsmart-${CACHE_VERSION}`;

const OFFLINE_FALLBACK_URL = '/offline.html';
const LOG_REMINDER_TITLE = '⏰ Time for Your Eight-Hour Check-In';
const LOG_REMINDER_BODY = "It's time to check-in 🤗";

function normalizeReminderPayload(payload = {}) {
  const body = String(payload.body || '');
  const title = String(payload.title || '');
  const tag = String(payload.tag || '');
  const type = String(payload.type || payload.kind || '');
  const isLogReminder =
    tag.includes('logging-reminder') ||
    type === 'reminder' ||
    /time\s+to\s+log/i.test(title) ||
    /last\s+(?:4|f(?:ou)?r)\s+hours/i.test(body);

  if (!isLogReminder) return payload;

  const isMissed = body.toLowerCase().includes('missed') || title.toLowerCase().includes('missed') || payload.kind === 'missed-checkin';

  return {
    ...payload,
    title: isMissed ? '⏰ Missed Check-In' : LOG_REMINDER_TITLE,
    body: isMissed ? 'You missed your 8-hour check-in' : LOG_REMINDER_BODY,
    tag: 'logging-reminder',
    type: 'reminder',
    kind: isMissed ? 'missed-checkin' : 'reminder',
    url: payload.url || '/log-episode',
  };
}

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
    const payload = normalizeReminderPayload({ title: event.data.title, ...(event.data.options || {}) });
    await self.registration.showNotification(payload.title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...payload,
      // ANDROID FIX: Always mark as user visible
      silent: payload.kind === 'missed-checkin',
      requireInteraction: payload?.requireInteraction !== false,
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

        data = normalizeReminderPayload(data);

        const title = data.title || 'SweatSmart';
        const tag = data.tag || 'sweatsmart-push';
        const url = data.url || '/';

        // ANDROID FIX: Set proper notification options and channels
        const channelId = (data.channel === 'climate' || data.type === 'climate')
          ? 'climate-alerts'
          : 'check-in-reminders';

        const notificationOptions = {
          body: data.body || '',
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: tag,
          data: { url, timestamp: Date.now() },
          // CRITICAL FOR ANDROID:
          silent: data.kind === 'missed-checkin',
          requireInteraction: true,
          vibrate: [200, 100, 200],
          // ANDROID CHANNEL SUPPORT
          channelId: channelId,
          actions: [
            {
              action: 'open',
              title: 'Open App',
              icon: '/favicon.ico'
            }
          ]
        };

        if (channelId === 'climate-alerts') {
          notificationOptions.tag = 'sweatsmart-climate-alert';
          console.log('🌡️ High-priority climate alert');
        }

        await self.registration.showNotification(title, notificationOptions);
        console.log('✅ Notification shown:', title);

        // Notify open clients for audio playback (only if app is open)
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const supportedKinds = ['reminder', 'checkin', 'missed-checkin', 'low', 'moderate', 'high', 'extreme'];
        const candidateKind = data.kind || data.type || 'reminder';
        const kind = supportedKinds.includes(candidateKind) ? candidateKind : 'reminder';
        for (const client of clients) {

          client.postMessage({ type: 'PUSH_RECEIVED', data });
          // A missed check-in is informational; never play the due-now voice for it.
          if (kind !== 'missed-checkin') {
            client.postMessage({
              type: 'PLAY_NOTIFICATION_SOUND',
              kind,
            });
          }
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
