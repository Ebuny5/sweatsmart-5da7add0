/**
 * NativePushService — real push delivery for the Capacitor Android/iOS shell.
 *
 * The Web Push pipeline (WebPushService + service worker) cannot work inside a
 * native WebView: there is no `PushManager` and service-worker push events are
 * never delivered while the app is closed. This service registers the device
 * with FCM/APNs instead and stores the device token in Supabase so the
 * `send-push-notification` edge function can reach it when the app is not running.
 *
 * Web builds are unaffected — every method is a no-op unless Capacitor reports a
 * native platform.
 */

import { supabase } from '@/integrations/supabase/client';

type CapPlugin = {
  checkPermissions: () => Promise<{ receive: string }>;
  requestPermissions: () => Promise<{ receive: string }>;
  register: () => Promise<void>;
  addListener: (
    event: string,
    cb: (payload: any) => void,
  ) => Promise<{ remove: () => Promise<void> }>;
};

type NativeModules = {
  isNative: boolean;
  PushNotifications?: CapPlugin;
  Capacitor?: any;
};

const TOKEN_KEY = 'sweatsmart:native_push:token';
const LAST_SYNC_KEY = 'sweatsmart:native_push:last_sync';
const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

let mods: NativeModules | null = null;
let listenersAttached = false;
let registering = false;
let navigationHandler: ((url: string) => void) | null = null;

async function loadModules(): Promise<NativeModules> {
  if (mods) return mods;
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform?.()) {
      mods = { isNative: false };
      return mods;
    }
    const { PushNotifications } = await import('@capacitor/push-notifications');
    mods = { isNative: true, PushNotifications: PushNotifications as unknown as CapPlugin, Capacitor };
  } catch (e) {
    console.warn('[NativePush] Capacitor push plugin unavailable:', e);
    mods = { isNative: false };
  }
  return mods;
}

function nativeEndpoint(platform: string, token: string): string {
  return `native:${platform}:${token}`;
}

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

function readCachedCoords(): { latitude: number; longitude: number } | null {
  try {
    const raw = localStorage.getItem('sweatsmart:lastCoords');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.latitude === 'number' && typeof parsed?.longitude === 'number') {
      return { latitude: parsed.latitude, longitude: parsed.longitude };
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function getAppVersion(): Promise<string | null> {
  try {
    const { App } = await import('@capacitor/app');
    const info = await App.getInfo();
    return info?.version ?? null;
  } catch {
    return null;
  }
}

async function getSignedInUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Persist the FCM/APNs token so the server can push to this install.
 * A rotated token deletes the stale row first (FCM rotates tokens on reinstall,
 * data clear, or occasionally on its own).
 */
async function persistToken(token: string): Promise<boolean> {
  const m = await loadModules();
  if (!m.isNative || !m.Capacitor) return false;

  const platform = m.Capacitor.getPlatform();
  const endpoint = nativeEndpoint(platform, token);
  const previous = readStoredToken();

  if (previous && previous !== token) {
    try {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', nativeEndpoint(platform, previous));
    } catch {
      /* best effort */
    }
  }

  const [userId, appVersion] = await Promise.all([getSignedInUserId(), getAppVersion()]);
  if (!userId) {
    // Reminders are per-account; registration is retried once the user signs in.
    console.log('[NativePush] No signed-in user yet, deferring token storage.');
    return false;
  }
  const coords = readCachedCoords();

  const row: any = {
    endpoint,
    kind: platform,
    platform,
    device_token: token,
    user_id: userId,
    is_active: true,
    app_version: appVersion,
    last_seen_at: new Date().toISOString(),
  };
  if (coords) {
    row.latitude = coords.latitude;
    row.longitude = coords.longitude;
  }

  // Native rows carry a device token instead of the web-push p256dh/auth keys.
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(row as any, { onConflict: 'endpoint' });

  if (error) {
    console.error('[NativePush] Failed to store device token:', error.message);
    return false;
  }

  storeToken(token);
  console.log('[NativePush] Device registered for background push:', platform);
  return true;
}

function attachListeners(m: NativeModules) {
  if (listenersAttached || !m.PushNotifications) return;
  listenersAttached = true;

  m.PushNotifications.addListener('registration', (token: { value?: string }) => {
    if (token?.value) void persistToken(token.value);
  });

  m.PushNotifications.addListener('registrationError', (err: unknown) => {
    console.warn('[NativePush] Registration failed:', err);
  });

  // Android does not display FCM notifications itself while the app is in the
  // foreground, so mirror the web behaviour (toast + sound + local notification).
  m.PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
    const data = notification?.data || {};
    const title = notification?.title || 'HidroAlly';
    const body = notification?.body || '';
    if (!title && !body) return;

    try {
      window.dispatchEvent(
        new CustomEvent('sweatsmart-notification', {
          detail: {
            title,
            body,
            type: 'info',
            channel: data.channel === 'climate' ? 'climate' : 'system',
          },
        }),
      );
    } catch {
      /* ignore */
    }

    void import('./NativeNotificationBridge').then(({ showNativeNotification }) =>
      showNativeNotification({
        title,
        body,
        url: data.url,
        channelId: data.channel === 'climate' ? 'climate' : 'reminder',
      }),
    );
  });

  m.PushNotifications.addListener('pushNotificationActionPerformed', (action: any) => {
    const url = action?.notification?.data?.url;
    if (!url) return;
    if (navigationHandler) navigationHandler(url);
    else window.location.assign(url);
  });
}

async function registerDevice(m: NativeModules): Promise<boolean> {
  if (!m.PushNotifications || registering) return false;
  registering = true;
  try {
    await m.PushNotifications.register();
    return true;
  } catch (e) {
    console.warn('[NativePush] register() failed:', e);
    return false;
  } finally {
    registering = false;
  }
}

/**
 * Attach listeners and register if permission is already granted.
 * Safe to call repeatedly.
 */
export async function initializeNativePush(): Promise<boolean> {
  const m = await loadModules();
  if (!m.isNative || !m.PushNotifications) return false;

  attachListeners(m);

  try {
    const perm = await m.PushNotifications.checkPermissions();
    if (perm.receive === 'granted') return registerDevice(m);
  } catch (e) {
    console.warn('[NativePush] checkPermissions failed:', e);
  }
  return false;
}

/**
 * Ask for OS permission (call from a user gesture or the existing permission flow)
 * and register when granted.
 */
export async function requestNativePushPermissionAndRegister(): Promise<boolean> {
  const m = await loadModules();
  if (!m.isNative || !m.PushNotifications) return false;

  attachListeners(m);
  try {
    const perm = await m.PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') return false;
    return registerDevice(m);
  } catch (e) {
    console.warn('[NativePush] requestPermissions failed:', e);
    return false;
  }
}

/**
 * Refresh the device row (user binding, location, app version, last-seen) and
 * re-register when the token is stale. Called on login and on app resume.
 */
export async function syncNativePushContext(): Promise<void> {
  const m = await loadModules();
  if (!m.isNative || !m.PushNotifications) return;

  attachListeners(m);

  try {
    const perm = await m.PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') return;

    const token = readStoredToken();
    if (!token) {
      await registerDevice(m);
      return;
    }

    const userId = await getSignedInUserId();
    const coords = readCachedCoords();
    const appVersion = await getAppVersion();
    const platform = m.Capacitor.getPlatform();

    const updates: any = {
      last_seen_at: new Date().toISOString(),
      is_active: true,
    };
    if (userId) updates.user_id = userId;
    if (coords) {
      updates.latitude = coords.latitude;
      updates.longitude = coords.longitude;
    }
    if (appVersion) updates.app_version = appVersion;

    const { data: updatedRows } = await supabase
      .from('push_subscriptions')
      .update(updates)
      .eq('endpoint', nativeEndpoint(platform, token))
      .select('id');

    // The row can disappear (sign-out deletes it, or the server pruned a dead
    // token). Register again so this install is reachable.
    if (!updatedRows || updatedRows.length === 0) {
      await registerDevice(m);
      return;
    }

    const lastSync = Number(localStorage.getItem(LAST_SYNC_KEY) || 0);
    if (Date.now() - lastSync > SYNC_INTERVAL_MS) {
      localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
      await registerDevice(m);
    }
  } catch (e) {
    console.warn('[NativePush] context sync failed:', e);
  }
}

/** Let the SPA handle taps from a cold start as well as from the background. */
export function setNativePushNavigationHandler(handler: ((url: string) => void) | null) {
  navigationHandler = handler;
}

/**
 * Remove this device's token row. Called on sign-out so the next account on the
 * phone does not inherit the previous user's reminders.
 */
export async function clearNativePushBinding(): Promise<void> {
  const m = await loadModules();
  if (!m.isNative || !m.Capacitor) return;

  const token = readStoredToken();
  if (!token) return;

  try {
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', nativeEndpoint(m.Capacitor.getPlatform(), token));
  } catch {
    /* best effort */
  } finally {
    // Force a fresh registration on the next sign-in.
    storeToken(null);
  }
}
