/**
 * Native notification bridge — uses Capacitor LocalNotifications when running
 * inside the native Android/iOS shell, so reminders + climate alerts fire
 * even when the app is backgrounded or the screen is off.
 *
 * On the web build these calls become no-ops and the existing Web Push /
 * Web Notification path continues to run.
 */

let capCache: {
  isNative: boolean;
  platform: string;
  LocalNotifications?: typeof import('@capacitor/local-notifications').LocalNotifications;
  PushNotifications?: typeof import('@capacitor/push-notifications').PushNotifications;
  Capacitor?: typeof import('@capacitor/core').Capacitor;
} | null = null;

async function loadCapacitor() {
  if (capCache) return capCache;
  try {
    const { Capacitor } = await import('@capacitor/core');
    const isNative = Capacitor.isNativePlatform?.() ?? false;
    const platform = Capacitor.getPlatform?.() ?? 'web';
    if (!isNative) {
      capCache = { isNative: false, platform };
      return capCache;
    }
    const [{ LocalNotifications }, { PushNotifications }] = await Promise.all([
      import('@capacitor/local-notifications'),
      import('@capacitor/push-notifications'),
    ]);
    capCache = { isNative: true, platform, LocalNotifications, PushNotifications, Capacitor };
  } catch {
    capCache = { isNative: false, platform: 'web' };
  }
  return capCache;
}

export async function isNativeApp(): Promise<boolean> {
  const c = await loadCapacitor();
  return c.isNative;
}

export async function ensureNativeChannels(): Promise<void> {
  const c = await loadCapacitor();
  if (!c.isNative || !c.LocalNotifications || c.platform !== 'android') return;

  try {
    await c.LocalNotifications.createChannel({
      id: 'reminder',
      name: 'Check-in Reminders',
      description: 'Daily sweat tracking reminders',
      importance: 5,          // IMPORTANCE_HIGH
      visibility: 1,          // VISIBILITY_PUBLIC
      vibration: true,
      lights: true,
      lightColor: '#7C3AED',
    });
    await c.LocalNotifications.createChannel({
      id: 'climate',
      name: 'Climate Alerts',
      description: 'Real-time sweat risk alerts',
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: '#EF4444',
    });
    console.log('✅ Native notification channels ensured');
  } catch (e) {
    console.warn('Failed to create native channels:', e);
  }
}

export async function requestNativePermissions(): Promise<boolean> {
  const c = await loadCapacitor();
  if (!c.isNative || !c.LocalNotifications) return false;

  try {
    // Check current permission status first
    const existing = await c.LocalNotifications.checkPermissions();
    let granted = existing.display === 'granted';

    if (!granted) {
      const result = await c.LocalNotifications.requestPermissions();
      granted = result.display === 'granted';
    }

    if (!granted) {
      console.warn('⚠️ Local notification permission denied');
      return false;
    }

    // Ensure high-priority channels exist on Android
    await ensureNativeChannels();

    // Register for push notifications as well
    if (c.PushNotifications) {
      const pushStatus = await c.PushNotifications.checkPermissions();
      if (pushStatus.receive !== 'granted') {
        const pushResult = await c.PushNotifications.requestPermissions();
        if (pushResult.receive === 'granted') {
          await c.PushNotifications.register();
        }
      } else {
        await c.PushNotifications.register();
      }
    }

    console.log('✅ Native notification permissions granted');
    return true;
  } catch (e) {
    console.warn('Native permission request failed:', e);
    return false;
  }
}

/**
 * Schedule a one-shot local notification at a specific time.
 * Uses allowWhileIdle so it fires even in Android Doze mode.
 */
export async function scheduleNativeReminder(opts: {
  id: number;
  at: Date;
  title: string;
  body: string;
  url?: string;
  channelId?: string;
}): Promise<boolean> {
  const c = await loadCapacitor();
  if (!c.isNative || !c.LocalNotifications) return false;

  // Guard: Don't schedule in the past (add 2s buffer)
  if (opts.at.getTime() <= Date.now() + 2000) {
    console.warn('scheduleNativeReminder: Target time is in the past or too soon, skipping.');
    return false;
  }

  try {
    // Cancel any existing notification with this ID to avoid duplicates
    await c.LocalNotifications.cancel({ notifications: [{ id: opts.id }] }).catch(() => {});

    await c.LocalNotifications.schedule({
      notifications: [
        {
          id: opts.id,
          title: opts.title,
          body: opts.body,
          largeBody: opts.body,
          summaryText: 'HidroAlly Reminder',
          schedule: {
            at: opts.at,
            allowWhileIdle: true,  // Critical for Android Doze mode
          },
          smallIcon: 'ic_stat_icon_config_sample',
          channelId: opts.channelId ?? 'reminder',
          extra: { url: opts.url ?? '/' },
          actionTypeId: '',
          // Android: auto-cancel when tapped
          ongoing: false,
          autoCancel: true,
        },
      ],
    });
    console.log(`✅ Native reminder ${opts.id} scheduled for ${opts.at.toLocaleString()}`);
    return true;
  } catch (e) {
    console.warn('scheduleNativeReminder failed:', e);
    return false;
  }
}

/** Fire an immediate native notification (used for climate alerts). */
export async function showNativeNotification(opts: {
  id?: number;
  title: string;
  body: string;
  url?: string;
  channelId?: string;
}): Promise<boolean> {
  const c = await loadCapacitor();
  if (!c.isNative || !c.LocalNotifications) return false;

  try {
    await c.LocalNotifications.schedule({
      notifications: [
        {
          id: opts.id ?? Math.floor(Date.now() % 2_147_483_647),
          title: opts.title,
          body: opts.body,
          largeBody: opts.body,
          summaryText: 'HidroAlly',
          schedule: {
            at: new Date(Date.now() + 500),
            allowWhileIdle: true,
          },
          smallIcon: 'ic_stat_icon_config_sample',
          channelId: opts.channelId ?? 'climate',
          extra: { url: opts.url ?? '/' },
          autoCancel: true,
        },
      ],
    });
    return true;
  } catch (e) {
    console.warn('showNativeNotification failed:', e);
    return false;
  }
}

/** Register a tap handler so tapping a notification navigates in the SPA. */
export async function attachNativeTapHandler(navigate: (url: string) => void) {
  const c = await loadCapacitor();
  if (!c.isNative || !c.LocalNotifications) return;

  try {
    // Handle taps on local notifications
    await c.LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (event) => {
        const url = (event.notification.extra as Record<string, string> | undefined)?.url;
        if (url) navigate(url);
      },
    );

    // Handle taps on push notifications
    if (c.PushNotifications) {
      await c.PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (event) => {
          const url = (event.notification.data as Record<string, string> | undefined)?.url;
          if (url) navigate(url);
        },
      );
    }
  } catch {
    /* ignore */
  }
}
