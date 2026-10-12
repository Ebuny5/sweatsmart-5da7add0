/**
 * NotificationManager — FIXED for Android + PWA
 * NOW INCLUDES: Service Worker registration + push subscription
 * Handles:
 *   - Service Worker registration
 *   - Push subscription to receive notifications
 *   - Web/PWA notifications with Android support
 *   - Deduplication & cooldowns
 *   - Audio + in-app toast
 */

import { audioAlertPlayer, type AlertKind } from '@/utils/audioAlertPlayer';
import { webPushService } from './WebPushService';
import {
  isNativeApp,
  requestNativePermissions,
  scheduleNativeReminder,
  showNativeNotification,
  ensureNativeChannels,
} from './NativeNotificationBridge';

export type NotificationChannel = 'climate' | 'reminder' | 'system';

export interface NotificationRequest {
  channel: NotificationChannel;
  kind: AlertKind;
  title: string;
  body: string;
  dedupKey: string;
  url?: string;
  toastVariant?: 'default' | 'destructive';
  cooldownMs?: number;
}

const DEFAULT_COOLDOWN_MS: Record<NotificationChannel, number> = {
  climate: 30 * 60 * 1000,
  reminder: 15 * 60 * 1000,
  system: 0,
};

const GLOBAL_MIN_GAP_MS = 8 * 1000;
const STORAGE_KEY = 'sweatsmart_notif_state_v2';
const BG_ENABLED_KEY = 'sweatsmart_bg_notifications_enabled';
const SW_REGISTERED_KEY = 'sweatsmart_sw_registered';

export function isBackgroundNotificationsEnabled(): boolean {
  try {
    const v = localStorage.getItem(BG_ENABLED_KEY);
    if (v === null) return true;
    return JSON.parse(v) !== false;
  } catch {
    return true;
  }
}

export function setBackgroundNotificationsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(BG_ENABLED_KEY, JSON.stringify(enabled));
  } catch {
    /* ignore */
  }
}

interface PersistedState {
  lastByKey: Record<string, number>;
  lastByChannel: Partial<Record<NotificationChannel, number>>;
  lastGlobal: number;
}

function readState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { lastByKey: {}, lastByChannel: {}, lastGlobal: 0 };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      lastByKey: (parsed.lastByKey as Record<string, number>) || {},
      lastByChannel: (parsed.lastByChannel as Partial<Record<NotificationChannel, number>>) || {},
      lastGlobal: (parsed.lastGlobal as number) || 0,
    };
  } catch {
    return { lastByKey: {}, lastByChannel: {}, lastGlobal: 0 };
  }
}

function writeState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

class NotificationManager {
  private static instance: NotificationManager;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private swInitialized = false;

  private constructor() {
    this.initClickListeners();
    // CRITICAL: Initialize Service Worker on construction
    this.initServiceWorker();
    // Ensure native channels on Android immediately
    void ensureNativeChannels();
  }

  /**
   * Service Worker Registration + auto push subscription sync
   */
  private async initServiceWorker(): Promise<void> {
    if (this.swInitialized) return;
    this.swInitialized = true;

    if (!('serviceWorker' in navigator)) {
      console.warn('⚠️ Service Worker not supported on this device');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });

      this.swRegistration = registration;
      console.log('✅ Service Worker registered successfully');
      localStorage.setItem(SW_REGISTERED_KEY, 'true');

      registration.addEventListener('updatefound', () => {
        console.log('📦 Service Worker update found');
      });

      // If permission already granted, ensure subscription is fresh
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        console.log('🔔 Permission already granted, ensuring push subscription...');
        try {
          const isSubscribed = await webPushService.isSubscribed();
          if (isSubscribed) {
            await webPushService.ensureFreshSubscription();
            await webPushService.syncSubscriptionContext();
          } else {
            await webPushService.subscribe();
          }
        } catch (pushErr) {
          console.error('⚠️ Auto-push sync failed:', pushErr);
        }
      }

    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      localStorage.setItem(SW_REGISTERED_KEY, 'false');
    }
  }

  /**
   * Request permission for native notifications
   */
  async requestPermission(): Promise<boolean> {
    if (typeof Notification !== 'undefined') {
      try {
        const permission = await Notification.requestPermission();
        console.log('🔔 Notification permission:', permission);
        
        if (permission === 'granted') {
          await this.initServiceWorker();
          return true;
        }
        return false;
      } catch (error) {
        console.error('❌ Permission request failed:', error);
        return false;
      }
    }
    return false;
  }

  async getPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'prompt-with-rationale'> {
    if (typeof Notification !== 'undefined') {
      return Notification.permission === 'default' ? 'prompt' : Notification.permission;
    }
    return 'denied';
  }

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  private initClickListeners() {
    // Native click listeners handled via standard Notification API
  }

  /**
   * Send a notification through the central pipeline.
   */
  async send(req: NotificationRequest): Promise<boolean> {
    const now = Date.now();
    const state = readState();
    const cooldown = req.cooldownMs ?? DEFAULT_COOLDOWN_MS[req.channel];
    const isTest = req.channel === 'system';

    if (!isTest) {
      const lastForKey = state.lastByKey[req.dedupKey] ?? 0;
      if (now - lastForKey < cooldown) {
        console.log(
          `🔕 [${req.channel}] suppressed dedup "${req.dedupKey}" (${Math.round(
            (cooldown - (now - lastForKey)) / 1000,
          )}s remaining)`,
        );
        return false;
      }

      const lastForChannel = state.lastByChannel[req.channel] ?? 0;
      if (now - lastForChannel < cooldown / 2) {
        console.log(`🔕 [${req.channel}] suppressed (channel cooldown)`);
        return false;
      }

      if (now - state.lastGlobal < GLOBAL_MIN_GAP_MS) {
        console.log(`🔕 [${req.channel}] suppressed (global min-gap)`);
        return false;
      }
    }

    // ── Deliver ──
    state.lastByKey[req.dedupKey] = now;
    state.lastByChannel[req.channel] = now;
    state.lastGlobal = now;
    writeState(state);

    console.log(`🔔 [${req.channel}/${req.kind}] ${req.title} — ${req.body}`);

    audioAlertPlayer.playAlert(req.kind).catch(() => {});
    void this.showSystemNotification(req);
    // Native (Android/iOS) local notification for background delivery
    void showNativeNotification({ title: req.title, body: req.body, url: req.url });

    try {
      window.dispatchEvent(
        new CustomEvent('sweatsmart-notification', {
          detail: {
            title: req.title,
            body: req.body,
            type: req.toastVariant === 'destructive' ? 'destructive' : 'info',
            channel: req.channel,
          },
        }),
      );
    } catch {
      /* ignore */
    }

    return true;
  }

  async scheduleReminder(at: Date, title: string, body: string, url: string): Promise<void> {
    if (!isBackgroundNotificationsEnabled()) {
      console.log('🔕 Background notifications disabled');
      return;
    }
    console.log('📅 Reminder scheduled:', at.toLocaleString(), title);
    const id = Math.floor((at.getTime() / 60000) % 2147483647);
    await scheduleNativeReminder({ id, at, title, body, url });
  }

  async requestNativePermissionsIfAvailable(): Promise<boolean> {
    if (await isNativeApp()) {
      return requestNativePermissions();
    }
    return false;
  }

  private async showSystemNotification(req: NotificationRequest): Promise<void> {
    if (typeof window === 'undefined') return;

    if (!isBackgroundNotificationsEnabled()) {
      console.log('🔕 Background notifications disabled in settings');
      return;
    }

    try {
      if (
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
        // NOTE: visibility check removed — notifications must show even when app is open
        // so beta users and investors see them during demos and real use
      ) {
        const notification = new Notification(req.title, {
          body: req.body,
          tag: req.dedupKey,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          requireInteraction: req.channel === 'climate',
        });

        notification.onclick = () => {
          window.focus();
          window.location.href = req.url || '/';
          notification.close();
        };
      }
    } catch (err) {
      console.warn('❌ Web notification failed:', err);
    }
  }

  resetCooldowns(): void {
    writeState({ lastByKey: {}, lastByChannel: {}, lastGlobal: 0 });
  }

  /**
   * For debugging: Check current state
   */
  getDebugStatus(): object {
    return {
      swRegistered: !!this.swRegistration,
      swInitialized: this.swInitialized,
      notificationPermission: typeof Notification !== 'undefined' ? Notification.permission : 'N/A',
      bgEnabled: isBackgroundNotificationsEnabled(),
      localStorage: {
        swRegistered: localStorage.getItem(SW_REGISTERED_KEY),
        pushSubscribed: localStorage.getItem('sweatsmart_push_subscribed'),
      },
    };
  }
}

export const notificationManager = NotificationManager.getInstance();
