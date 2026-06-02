import { notificationManager } from './NotificationManager';

const PRODUCTION_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const LAST_LOG_TIME_KEY = 'sweatsmart_last_log_time';
const ONBOARDING_TIME_KEY = 'sweatsmart_onboarding_time';

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
   * Calculates when the next log is due (6 hours after last log or onboarding).
   */
  getNextScheduledTime(): number {
    const lastLog = parseInt(localStorage.getItem(LAST_LOG_TIME_KEY) || '0', 10);
    const onboarding = parseInt(localStorage.getItem(ONBOARDING_TIME_KEY) || '0', 10);

    // Prioritize lastLog. If neither exists, use now as baseline.
    const baseline = lastLog || onboarding || Date.now();
    let nextTime = baseline + PRODUCTION_INTERVAL_MS;

    // If nextTime is in the past, find the next 6-hour slot from now
    const now = Date.now();
    if (nextTime < now) {
      const diff = now - baseline;
      const cycles = Math.ceil(diff / PRODUCTION_INTERVAL_MS);
      nextTime = baseline + (cycles * PRODUCTION_INTERVAL_MS);
    }

    return nextTime;
  }

  async checkForDueLog(): Promise<void> {
    const nextTime = this.getNextScheduledTime();
    const now = Date.now();

    console.log(`📅 Next log due at: ${new Date(nextTime).toLocaleString()}`);

    // Schedule native reminder (Capacitor handles backgrounding)
    await notificationManager.scheduleReminder(
      new Date(nextTime),
      '⏰ Time to Check In',
      "Log your sweat level for the last six hours",
      '/log-episode'
    );

    // If we are currently in the window (within 5 mins of due time),
    // we also try to send an immediate alert if it hasn't been sent yet.
    if (now >= nextTime && now - nextTime < 5 * 60 * 1000) {
      await notificationManager.send({
        channel: 'reminder',
        kind: 'reminder',
        title: '⏰ Time to Check In',
        body: "Log your sweat level for the last six hours",
        dedupKey: `log-reminder-${nextTime}`,
        url: '/log-episode',
      });
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

  cleanup(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

export const loggingReminderService = LoggingReminderService.getInstance();
