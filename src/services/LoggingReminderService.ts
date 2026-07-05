import { notificationManager } from './NotificationManager';

export const PRODUCTION_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
export const LAST_LOG_TIME_KEY = 'sweatsmart_last_log_time';
export const ONBOARDING_TIME_KEY = 'sweatsmart_onboarding_time';
export const CURRENT_HDSS_KEY = 'sweatsmart_current_hdss';

class LoggingReminderService {
  private static instance: LoggingReminderService;
  private isInitialized = false;
  private checkInterval: NodeJS.Timeout | null = null;

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

    // Set onboarding time if not exists
    if (!localStorage.getItem(ONBOARDING_TIME_KEY)) {
      localStorage.setItem(ONBOARDING_TIME_KEY, Date.now().toString());
    }

    this.startLogChecker();
    this.isInitialized = true;
    console.log('✅ Logging Reminder Service initialized');
  }

  private startLogChecker(): void {
    // Initial check and schedule
    this.checkForDueLog();

    // Check periodically in case localStorage was updated elsewhere
    this.checkInterval = setInterval(() => {
      this.checkForDueLog();
    }, 5 * 60 * 1000); // Check every 5 minutes

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkForDueLog();
      }
    });
  }

  /**
   * Calculates when the next log is due based on a baseline.
   */
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

  /**
   * Calculates when the next log is due (6 hours after last log or onboarding).
   */
  getNextScheduledTime(): number {
    const lastLog = parseInt(localStorage.getItem(LAST_LOG_TIME_KEY) || '0', 10);
    const onboarding = parseInt(localStorage.getItem(ONBOARDING_TIME_KEY) || '0', 10);

    // Prioritize lastLog. If neither exists, use now as baseline.
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

    // 1. Schedule/Send the upcoming/current reminder
    await notificationManager.scheduleReminder(
      new Date(nextTime),
      '⏰ Time for Your Six-Hour Check-In',
      "It's time for your six-hour check-in 💧",
      '/log-episode'
    );

    if (now >= nextTime && now - nextTime < 15 * 60 * 1000) {
      await notificationManager.send({
        channel: 'reminder',
        kind: 'reminder',
        title: '⏰ Time for Your Six-Hour Check-In',
        body: "It's time for your six-hour check-in 💧",
        dedupKey: `log-reminder-${nextTime}`,
        url: '/log-episode',
      });
    }

    // 2. Handle missed check-in logic for the PREVIOUS window
    // If the next due time is 14:00, the one we might have missed was 08:00.
    const previousDueTime = nextTime - PRODUCTION_INTERVAL_MS;

    // We missed it if our last log was before that previous due time
    const missedWindow = lastInteraction < previousDueTime;

    if (missedWindow) {
      const missed30m = previousDueTime + (30 * 60 * 1000);
      const missed2h = previousDueTime + (2 * 60 * 60 * 1000);

      // +30m Reminder
      if (now >= missed30m && now - missed30m < 15 * 60 * 1000) {
        await notificationManager.send({
          channel: 'reminder',
          kind: 'reminder',
          title: '⏰ Missed Check-In',
          body: "You missed your 6-hour check-in",
          dedupKey: `log-missed-30m-${previousDueTime}`,
          url: '/log-episode',
        });
      }

      // +2h Reminder
      if (now >= missed2h && now - missed2h < 15 * 60 * 1000) {
        await notificationManager.send({
          channel: 'reminder',
          kind: 'reminder',
          title: '⏰ Missed Check-In',
          body: "You missed your 6-hour check-in",
          dedupKey: `log-missed-2h-${previousDueTime}`,
          url: '/log-episode',
        });
      }
    }
  }

  /** Called by LogEpisode.tsx when a log is successfully saved */
  handleLogSaved(): void {
    const now = Date.now();
    localStorage.setItem(LAST_LOG_TIME_KEY, now.toString());
    console.log('📅 Log saved, rescheduling next reminder...');
    this.checkForDueLog();
  }

  forceCheck(): void {
    this.checkForDueLog();
  }

  async scheduleTestReminder(delayMs: number): Promise<void> {
    const at = new Date(Date.now() + delayMs);
    // Use a unique ID for test reminders to avoid colliding with production ones
    const testId = 999999;

    // Pass the unique testId to scheduleNativeReminder via the bridge
    const { scheduleNativeReminder, showNativeNotification } = await import('./NativeNotificationBridge');

    // Also trigger an immediate "Scheduled" confirmation notification for the user
    await showNativeNotification({
      title: "🧪 Test Scheduled",
      body: `Your ${Math.round(delayMs / 60000)}-minute test is set for ${at.toLocaleTimeString()}`,
      channelId: 'reminder'
    });

    await scheduleNativeReminder({
      id: testId,
      at,
      title: '🧪 SweatSmart Test Reminder',
      body: `This is your ${Math.round(delayMs / 60000)}-minute test reminder 💧`,
      url: '/log-episode',
      channelId: 'reminder'
    });

    console.log(`🧪 Test reminder scheduled for ${at.toLocaleString()} (delay: ${delayMs}ms) with ID ${testId}`);
  }

  cleanup(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

export const loggingReminderService = LoggingReminderService.getInstance();
