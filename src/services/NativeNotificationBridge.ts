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
  LocalNotifications?: typeof import('@capacitor/local-notifications').LocalNotifications;
  PushNotifications?: typeof import('@capacitor/push-notifications').PushNotifications;
  Capacitor?: any;
} | null = null;

async function loadCapacitor() {
  if (capCache) return capCache;
  try {
    const { Capacitor } = await import('@capacitor/core');
    const isNative = Capacitor.isNativePlatform?.() ?? false;
    if (!isNative) {
      capCache = { isNative: false };
      return capCache;
    }
    const [{ LocalNotifications }, { PushNotifications }] = await Promise.all([
      import('@capacitor/local-notifications'),
      import('@capacitor/push-notifications'),
    ]);
    capCache = { isNative: true, LocalNotifications, PushNotifications, Capacitor };
  } catch {
    capCache = { isNative: false };
  }
  return capCache;
}

export async function isNativeApp(): Promise<boolean> {
  const c = await loadCapacitor();
  return c.isNative;
}

export async function ensureNativeChannels(): Promise<void> {
  const c = await loadCapacitor();
  if (!c.isNative || !c.LocalNotifications || !c.Capacitor) return;

  if (c.Capacitor.getPlatform() === 'android') {
    try {
      await c.LocalNotifications.createChannel({
        id: 'reminder',
        name: 'Check-in Reminders',
        description: 'Daily sweat tracking reminders',
        importance: 5,
        visibility: 1,
        vibration: true,
      });
      await c.LocalNotifications.createChannel({
        id: 'climate',
        name: 'Climate Alerts',
        description: 'Real-time sweat risk alerts',
        importance: 5,
        visibility: 1,
        vibration: true,
      });
      console.log('✅ Native notification channels ensured');
    } catch (e) {
      console.warn('Failed to create native channels:', e);
    }
  }
}

export async function requestNativePermissions(): Promise<boolean> {
  const c = await loadCapacitor();
  if (!c.isNative || !c.LocalNotifications || !c.Capacitor) return false;
  try {
    const local = await c.LocalNotifications.requestPermissions();

    // Ensure high-priority channels exist on Android
    await ensureNativeChannels();

    if (c.PushNotifications) {
      const push = await c.PushNotifications.requestPermissions();
      if (push.receive === 'granted') {
        await c.PushNotifications.register();
      }
    }
    return local.display === 'granted';
  } catch (e) {
    console.warn('Native permission request failed:', e);
    return false;
  }
}

/** Schedule a one-shot local notification at a specific time. */
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

  // Guard: Don't schedule in the past
  if (opts.at.getTime() <= Date.now()) {
    console.warn('scheduleNativeReminder: Target time is in the past, skipping.');
    return false;
  }

  try {
    await c.LocalNotifications.cancel({ notifications: [{ id: opts.id }] });
    await c.LocalNotifications.schedule({
      notifications: [
        {
          id: opts.id,
          title: opts.title,
          body: opts.body,
          schedule: { at: opts.at, allowWhileIdle: true },
          smallIcon: 'ic_stat_icon_config_sample',
          channelId: opts.channelId || 'reminder',
          extra: { url: opts.url ?? '/' },
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
          id: opts.id ?? Math.floor(Date.now() % 2147483647),
          title: opts.title,
          body: opts.body,
          schedule: { at: new Date(Date.now() + 500), allowWhileIdle: true },
          smallIcon: 'ic_stat_icon_config_sample',
          channelId: opts.channelId || 'climate',
          extra: { url: opts.url ?? '/' },
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
    await c.LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (event) => {
        const url = (event.notification.extra as any)?.url as string | undefined;
        if (url) navigate(url);
      },
    );
  } catch {
    /* ignore */
  }
}
