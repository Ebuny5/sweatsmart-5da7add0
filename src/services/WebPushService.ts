/**
 * WebPushService - Handles Web Push subscription and notification management
 * Enables background notifications even when the app is closed
 */

import { supabase } from '@/integrations/supabase/client';

// Type helper: pushManager exists on ServiceWorkerRegistration at runtime
// but may not be in TS DOM lib depending on version
function getPushManager(reg: ServiceWorkerRegistration): PushManager {
  return (reg as ServiceWorkerRegistration & { pushManager: PushManager }).pushManager;
}

// VAPID public key is safe to expose in client code.
// We keep a fallback value, but prefer fetching the *current* public key from the
// edge function so it always matches the server-side VAPID private key.
const FALLBACK_VAPID_PUBLIC_KEY = 'BBEfnIOqmJdK5XmJp1ch7b2j1H_oVg7EE4jtIVY0dGeuEKWeXW1wivGt4-Iwy8A26cRuglF3clYdjtHJXJyX-pg';

const LS_VAPID_PUBLIC_KEY = 'sweatsmart:webpush:vapid_public_key';

class WebPushService {
  private static instance: WebPushService;
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;

  private vapidPublicKeyCache: string | null = null;
  private vapidPublicKeyFetchPromise: Promise<string> | null = null;

  private constructor() {}

  static getInstance(): WebPushService {
    if (!WebPushService.instance) {
      WebPushService.instance = new WebPushService();
    }
    return WebPushService.instance;
  }

  /**
   * Check if push notifications are supported
   */
  isSupported(): boolean {
    return 'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
  }

  private getStoredVapidPublicKey(): string | null {
    try {
      return localStorage.getItem(LS_VAPID_PUBLIC_KEY);
    } catch {
      return null;
    }
  }

  private setStoredVapidPublicKey(key: string | null) {
    try {
      if (key) {
        localStorage.setItem(LS_VAPID_PUBLIC_KEY, key);
      } else {
        localStorage.removeItem(LS_VAPID_PUBLIC_KEY);
      }
    } catch {
      // ignore storage errors (private mode, etc.)
    }
  }

  /**
   * Fetch the current VAPID public key from the edge function.
   * This keeps the client subscription aligned with the server-side VAPID private key.
   */
  private async getVapidPublicKey(): Promise<string> {
    if (this.vapidPublicKeyCache) return this.vapidPublicKeyCache;

    if (this.vapidPublicKeyFetchPromise) {
      return await this.vapidPublicKeyFetchPromise;
    }

    this.vapidPublicKeyFetchPromise = (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('send-push-notification', {
          body: { action: 'get_vapid_public_key' },
        });

        if (!error && data?.publicKey && typeof data.publicKey === 'string') {
          return data.publicKey;
        }
      } catch {
        // ignore and fall back
      }

      return FALLBACK_VAPID_PUBLIC_KEY;
    })();

    const key = await this.vapidPublicKeyFetchPromise;
    this.vapidPublicKeyCache = key;
    this.vapidPublicKeyFetchPromise = null;
    return key;
  }

  /**
   * Get current permission status
   */
  getPermissionStatus(): NotificationPermission {
    if (typeof Notification === 'undefined') {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (typeof Notification === 'undefined') {
      console.error('Notifications not supported');
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    console.log('📱 Push permission:', permission);
    return permission;
  }

  /**
   * Initialize the service worker and get push subscription
   */
  async initialize(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      // Wait for service worker to be ready
      this.registration = await navigator.serviceWorker.ready;
      console.log('📱 Service worker ready for push');

      // Check for existing subscription
      this.subscription = await getPushManager(this.registration).getSubscription();

      if (this.subscription) {
        console.log('📱 Existing push subscription found');
        return true;
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize push service:', error);
      return false;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(
    userId?: string,
    latitude?: number,
    longitude?: number,
    thresholds?: {
      temperature?: number;
      humidity?: number;
      uv?: number;
    }
  ): Promise<PushSubscription | null> {
    if (!this.registration) {
      await this.initialize();
    }

    if (!this.registration) {
      console.error('Service worker not ready');
      return null;
    }

    try {
      // Request permission if needed
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        const permission = await this.requestPermission();
        if (permission !== 'granted') {
          console.log('Push permission denied');
          return null;
        }
      }

      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
        console.log('Push permission not granted or unsupported');
        return null;
      }

      // Fetch the current VAPID public key (kept in sync with the backend)
      const vapidPublicKey = await this.getVapidPublicKey();

      // Convert VAPID key to Uint8Array
      const applicationServerKey = this.urlBase64ToUint8Array(vapidPublicKey);

      // Subscribe to push
      this.subscription = await getPushManager(this.registration).subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      console.log('📱 Push subscription created:', this.subscription.endpoint);

      // Extract keys from subscription
      const keys = this.subscription.toJSON().keys;
      if (!keys?.p256dh || !keys?.auth) {
        throw new Error('Failed to get subscription keys');
      }

      // Fall back to the signed-in user when no id was passed in
      let resolvedUserId = userId || null;
      if (!resolvedUserId) {
        try {
          const { data } = await supabase.auth.getUser();
          resolvedUserId = data?.user?.id || null;
        } catch {
          resolvedUserId = null;
        }
      }

      // Fall back to the device location when no coordinates were passed in
      let lat = latitude ?? null;
      let lon = longitude ?? null;
      if (lat == null || lon == null) {
        const coords = await this.getCurrentCoords();
        lat = coords?.latitude ?? null;
        lon = coords?.longitude ?? null;
      }

      // Store subscription in database
      console.log('📱 Storing subscription in DB for user:', resolvedUserId);
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: resolvedUserId,
          endpoint: this.subscription.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          latitude: lat,
          longitude: lon,
          temperature_threshold: thresholds?.temperature || 27,
          humidity_threshold: thresholds?.humidity || 75,
          uv_threshold: thresholds?.uv || 6,
          is_active: true,
        }, {
          onConflict: 'endpoint',
        });

      if (error) {
        console.error('Failed to store subscription:', error);
        throw error;
      }

      console.log('📱 Push subscription stored in database successfully');
      this.setStoredVapidPublicKey(vapidPublicKey);
      return this.subscription;
    } catch (error) {
      console.error('Failed to subscribe to push:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.subscription) {
      await this.getSubscription();
    }

    if (!this.subscription) {
      this.setStoredVapidPublicKey(null);
      return true;
    }

    try {
      // Remove from database
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', this.subscription.endpoint);

      // Unsubscribe from push
      await this.subscription.unsubscribe();
      this.subscription = null;
      this.setStoredVapidPublicKey(null);

      console.log('📱 Push subscription removed');
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return false;
    }
  }

  /**
   * Force a fresh subscription using the currently configured VAPID keys.
   * This is the main fix for "VAPID credentials mismatch".
   */
  async refreshSubscription(
    userId?: string,
    latitude?: number,
    longitude?: number,
    thresholds?: {
      temperature?: number;
      humidity?: number;
      uv?: number;
    }
  ): Promise<PushSubscription | null> {
    if (!this.registration) {
      await this.initialize();
    }

    if (!this.registration) {
      console.error('Service worker not ready');
      return null;
    }

    try {
      const existing = await getPushManager(this.registration).getSubscription();

      if (existing) {
        // Best-effort cleanup of the old endpoint
        try {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', existing.endpoint);
        } catch {
          // ignore
        }

        try {
          await existing.unsubscribe();
        } catch {
          // ignore
        }
      }

      this.subscription = null;
      this.setStoredVapidPublicKey(null);

      return await this.subscribe(userId, latitude, longitude, thresholds);
    } catch (error) {
      console.error('Failed to refresh push subscription:', error);
      return null;
    }
  }

  /**
   * If we have a subscription created with older VAPID keys, recreate it automatically.
   */
  async ensureFreshSubscription(
    userId?: string,
    latitude?: number,
    longitude?: number,
    thresholds?: {
      temperature?: number;
      humidity?: number;
      uv?: number;
    }
  ): Promise<{ refreshed: boolean; subscription: PushSubscription | null }> {
    const subscribed = await this.isSubscribed();
    if (!subscribed || typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return { refreshed: false, subscription: this.subscription };
    }

    const currentKey = await this.getVapidPublicKey();
    const storedKey = this.getStoredVapidPublicKey();

    // Authoritative check: compare the key the browser actually subscribed with.
    let liveKey: string | null = null;
    try {
      const raw = this.subscription?.options?.applicationServerKey as ArrayBuffer | null | undefined;
      if (raw) {
        const bytes = new Uint8Array(raw);
        let bin = '';
        bytes.forEach((b) => { bin += String.fromCharCode(b); });
        liveKey = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      }
    } catch {
      liveKey = null;
    }

    if (liveKey && liveKey === currentKey) {
      this.setStoredVapidPublicKey(currentKey);
      return { refreshed: false, subscription: this.subscription };
    }

    if (!liveKey && storedKey && storedKey === currentKey) {
      return { refreshed: false, subscription: this.subscription };
    }

    const newSub = await this.refreshSubscription(userId, latitude, longitude, thresholds);
    return { refreshed: newSub !== null, subscription: newSub };
  }

  /**
   * Update subscription settings
   */
  async updateSettings(settings: {
    user_id?: string | null;
    latitude?: number;
    longitude?: number;
    temperature_threshold?: number;
    humidity_threshold?: number;
    uv_threshold?: number;
    is_active?: boolean;
  }): Promise<boolean> {
    if (!this.subscription) {
      await this.getSubscription();
    }

    if (!this.subscription) {
      console.warn('No active subscription to update');
      return false;
    }

    try {
      const { error } = await supabase
        .from('push_subscriptions')
        .update(settings)
        .eq('endpoint', this.subscription.endpoint);

      if (error) {
        console.error('Failed to update subscription:', error);
        return false;
      }

      console.log('📱 Push subscription settings updated');
      return true;
    } catch (error) {
      console.error('Failed to update settings:', error);
      return false;
    }
  }

  /**
   * Check if currently subscribed
   */
  async isSubscribed(): Promise<boolean> {
    if (!this.registration) {
      await this.initialize();
    }

    if (!this.registration) {
      return false;
    }

    this.subscription = await getPushManager(this.registration).getSubscription();
    return this.subscription !== null;
  }

  /**
   * Get current subscription
   */
  async getSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) {
      await this.initialize();
    }

    if (!this.registration) {
      return null;
    }

    this.subscription = await getPushManager(this.registration).getSubscription();
    return this.subscription;
  }

  /**
   * Send a test notification through the edge function
   */
  async sendTestNotification(): Promise<{ success: boolean; error?: string }> {
    if (!this.subscription) {
      console.warn('No active subscription');
      return { success: false, error: 'No active subscription' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          action: 'send_to_endpoint',
          endpoint: this.subscription.endpoint,
          notification: {
            title: '⏰ Time for Your Eight-Hour Check-In',
            body: "It's time to check-in 🤗",
            tag: 'logging-reminder-test',
            type: 'reminder',
            kind: 'reminder',
            url: '/log-episode',
          },
        },
      });

      if (error) {
        console.error('Test notification failed (invoke):', error);
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Unknown push error' };
      }

      console.log('📱 Test notification sent:', data);
      return { success: true };
    } catch (err) {
      console.error('Failed to send test notification:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * Get current location coordinates
   */
  private async getCurrentCoords(): Promise<{ latitude: number; longitude: number } | null> {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      return null;
    }

    try {
      // First check if permission is granted before trying to get location
      const perm = await navigator.permissions.query({ name: 'geolocation' });
      if (perm.state === 'denied' || perm.state === 'prompt') {
        return null;
      }

      return await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: false, timeout: 5000 }
        );
      });
    } catch {
      return null;
    }
  }

  /**
   * Sync the current user context (user_id and location) to the active subscription.
   */
  async syncSubscriptionContext(): Promise<boolean> {
    const subscribed = await this.isSubscribed();
    if (!subscribed) return false;

    let userId: string | null = null;
    try {
      const { data } = await supabase.auth.getUser();
      userId = data?.user?.id || null;
    } catch {
      // ignore
    }

    const coords = await this.getCurrentCoords();

    const updates: any = {};
    if (userId) updates.user_id = userId;
    if (coords) {
      updates.latitude = coords.latitude;
      updates.longitude = coords.longitude;
    }

    if (Object.keys(updates).length > 0) {
      return this.updateSettings(updates);
    }

    return true;
  }

  /**
   * Convert VAPID key from base64 URL to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }
}

// Export singleton instance
export const webPushService = WebPushService.getInstance();
