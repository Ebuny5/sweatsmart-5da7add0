import { notificationManager } from './NotificationManager';
import { webPushService } from './WebPushService';
import { supabase } from '@/integrations/supabase/client';

export const PRODUCTION_INTERVAL_MS = 8 * 60 * 60 * 1000; // 6 hours
export const LAST_LOG_TIME_KEY = 'sweatsmart_last_log_time';
export const ONBOARDING_TIME_KEY = 'sweatsmart_onboarding_time';
export const CURRENT_HDSS_KEY = 'sweatsmart_current_hdss';

class LoggingReminderService {
  private static instance: LoggingReminderService;
  private isInitialized = false;
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    this.initialize();
  }

  static getInstance(): LoggingReminderService {
    if (!LoggingReminderService.instance) {
      LoggingReminderService.instance = new LoggingReminderService();
    }
    return LoggingReminderService.instance;
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('📅 Logging Reminder Service initializing...');

    if (!localStorage.getItem(ONBOARDING_TIME_KEY)) {
      localStorage.setItem(ONBOARDING_TIME_KEY, Date.now().toString());
    }

    this.startLogChecker();
    this.isInitialized = true;
    console.log('✅ Logging Reminder Service initialized');
  }

  private startLogChecker(): void {
    this.checkForDueLog();

    this.checkInterval = setInterval(() => {
      this.checkForDueLog();
    }, 5 * 60 * 1000);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkForDueLog();
      }
    });
  }

  static calculateNextLogTime(baselineMs: number): number {
    let nextTime = baselineMs + PRODUCTION_INTERVAL_MS;
    const now = Date.now();

    if (nextTime < now) {
      const diff = now - baselineMs;
      const cycles = Math.ceil(diff / PRODUCTION_INTERVAL_MS);
      nextTime = baselineMs + (cycles * PRODUCTION_INTERVAL_MS);
    }

    return nextTime;
  }

  getNextScheduledTime(): number {
    const lastLog = parseInt(localStorage.getItem(LAST_LOG_TIME_KEY) || '0', 10);
    const onboarding = parseInt(localStorage.getItem(ONBOARDING_TIME_KEY) || '0', 10);
    const baseline = lastLog || onboarding || Date.now();
    return LoggingReminderService.calculateNextLogTime(baseline);
  }

  async checkForDueLog(): Promise<void> {
    const nextTime = this.getNextScheduledTime();
    const now = Date.now();
    const lastLog = parseInt(localStorage.getItem(LAST_LOG_TIME_KEY) || '0', 10);
    const onboarding = parseInt(localStorage.getItem(ONBOARDING_TIME_KEY) || '0', 10);
    const lastInteraction = lastLog || onboarding;

    console.log(`📅 Next log due at: ${new Date(nextTime).toLocaleString()}`);

    await notificationManager.scheduleReminder(
      new Date(nextTime),
      '⏰ Time for Your Eight-Hour Check-In',
      "It's time to check-in 🤗",
      '/log-episode'
    );

    if (now >= nextTime && now - nextTime < 15 * 60 * 1000) {
      await notificationManager.send({
        channel: 'reminder',
        kind: 'reminder',
        title: '⏰ Time for Your Eight-Hour Check-In',
        body: "It's time to check-in 🤗",
        dedupKey: `log-reminder-${nextTime}`,
        url: '/log-episode',
      });
    }

    const previousDueTime = nextTime - PRODUCTION_INTERVAL_MS;
    const missedWindow = lastInteraction < previousDueTime;

    if (missedWindow) {
      const missed30m = previousDueTime + (30 * 60 * 1000);
      const missed2h = previousDueTime + (2 * 60 * 60 * 1000);

      if (now >= missed30m && now - missed30m < 15 * 60 * 1000) {
        await notificationManager.send({
          channel: 'reminder',
          kind: 'reminder',
          title: '⏰ Missed Check-In',
          body: "Missed Check in 😋",
          dedupKey: `log-missed-30m-${previousDueTime}`,
          url: '/log-episode',
        });
      }

      if (now >= missed2h && now - missed2h < 15 * 60 * 1000) {
        await notificationManager.send({
          channel: 'reminder',
          kind: 'reminder',
          title: '⏰ Missed Check-In',
          body: "Missed Check in 😋",
          dedupKey: `log-missed-2h-${previousDueTime}`,
          url: '/log-episode',
        });
      }
    }
  }

  handleLogSaved(): void {
    const now = Date.now();
    localStorage.setItem(LAST_LOG_TIME_KEY, now.toString());
    console.log('📅 Log saved, rescheduling next reminder...');
    this.checkForDueLog();
  }

  forceCheck(): void {
    this.checkForDueLog();
  }

  /**
   * Schedule a test reminder.
   * On web: uses real Web Push via the edge function (works even when app is closed).
   * On native Android: schedules an OS-level local notification.
   */
  async scheduleTestReminder(delayMs: number): Promise<void> {
    const at = new Date(Date.now() + delayMs);
    const minutes = Math.round(delayMs / 60000);

    const { scheduleNativeReminder, showNativeNotification, isNativeApp } = await import('./NativeNotificationBridge');
    const isNative = await isNativeApp();

    if (isNative) {
      // Android/iOS: use OS-level scheduled notification
      await showNativeNotification({
        title: '🧪 Test Scheduled',
        body: `Your ${minutes}-minute test is set for ${at.toLocaleTimeString()}`,
        channelId: 'reminder',
      });

      await scheduleNativeReminder({
        id: 999999,
        at,
        title: '⏰ Time for Your Eight-Hour Check-In',
        body: "It's time to check-in 🤗",
        url: '/log-episode',
        channelId: 'reminder',
      });

      console.log(`🧪 Native test reminder scheduled for ${at.toLocaleString()}`);
      return;
    }

    // Web: schedule via edge function using Web Push so it fires even when closed
    const subscription = await webPushService.getSubscription();

    if (subscription) {
      // Offload the delay to the Edge Function (no client-side timeout)
      // We don't wait for this to resolve since it handles the delay on the server.
      supabase.functions.invoke('send-push-notification', {
        body: {
          action: 'send_to_endpoint',
          endpoint: subscription.endpoint,
          delayMs,
          keys: {
            p256dh: subscription.toJSON().keys?.p256dh,
            auth: subscription.toJSON().keys?.auth,
          },
          notification: {
            title: '⏰ Time for Your Eight-Hour Check-In',
            body: "It's time to check-in 🤗",
            tag: 'logging-reminder-test',
            type: 'reminder',
            kind: 'reminder',
            url: '/log-episode',
          },
        },
      }).then(({ data, error }) => {
        if (error || (data && !data.success)) {
          console.error('🧪 Web Push test edge function error:', error || data?.error);
        } else {
          console.log('🧪 Web Push test reminder delivered via edge function');
        }
      }).catch(err => {
         console.error('🧪 Web Push test failed to invoke:', err);
      });

      console.log(`🧪 Web Push test scheduled for ${at.toLocaleString()} (${delayMs}ms) on Edge Function`);
    } else {
      // No push subscription — fall back to in-app timer with a clear message
      // We removed the initial notification alert to avoid instant audio playback
      console.log(`No Web Push subscription found. Falling back to in-app timer for ${minutes} min.`);

      setTimeout(() => {
        notificationManager.send({
          channel: 'system',
          kind: 'reminder',
          title: '⏰ Time for Your Eight-Hour Check-In',
          body: "It's time to check-in 🤗",
          dedupKey: `test-rem-${Date.now()}`,
          url: '/log-episode',
        });
      }, delayMs);
    }
  }

  cleanup(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

export const loggingReminderService = LoggingReminderService.getInstance();
