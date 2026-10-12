import { supabase } from '@/integrations/supabase/client';
import { calculateSweatRisk, shouldTriggerAlert } from '@/utils/sweatRiskCalculator';
import { notificationManager } from './NotificationManager';

const WEATHER_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

class ClimateAlertService {
  private static instance: ClimateAlertService;
  private isInitialized = false;
  private refreshInterval: NodeJS.Timeout | null = null;
  private lastAlertType: string | null = null;

  private constructor() {
    this.lastAlertType = localStorage.getItem('climateLastAlertType');
  }

  static getInstance(): ClimateAlertService {
    if (!ClimateAlertService.instance) {
      ClimateAlertService.instance = new ClimateAlertService();
    }
    return ClimateAlertService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🌤️ Climate Alert Service initializing...');

    this.startWeatherMonitor();
    this.isInitialized = true;
    console.log('✅ Climate Alert Service initialized');
  }

  private startWeatherMonitor(): void {
    this.refreshWeather();

    this.refreshInterval = setInterval(() => {
      this.refreshWeather();
    }, WEATHER_REFRESH_INTERVAL);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.refreshWeather();
      }
    });
  }

  private async refreshWeather(): Promise<void> {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const { data, error } = await supabase.functions.invoke('get-weather-data', {
            body: { latitude, longitude }
          });

          if (error || data.simulated) return;

          this.processWeatherUpdate(data);
        } catch (err) {
          console.error('🌤️ Background weather fetch failed:', err);
        }
      },
      undefined,
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }

  private processWeatherUpdate(weatherData: any): void {
    const defaultThresholds = { temperature: 30, humidity: 65, uvIndex: 6 };
    const savedThresholdsStr = localStorage.getItem('sweatSmartThresholds');
    const thresholds = savedThresholdsStr ? JSON.parse(savedThresholdsStr) : defaultThresholds;

    const alertResult = shouldTriggerAlert(
      weatherData.temperature,
      weatherData.humidity,
      weatherData.uvIndex,
      thresholds,
      false,
      (weatherData as any).sky ?? 'unknown'
    );

    const risk = calculateSweatRisk(
      weatherData.temperature,
      weatherData.humidity,
      weatherData.uvIndex ?? 0,
      0,
      false,
      (weatherData as any).sky ?? 'unknown'
    );

    const riskToAlertType: Record<string, string> = {
      safe: 'optimal',
      low: 'optimal',
      moderate: 'moderate',
      high: 'high',
      extreme: 'extreme',
    };

    const currentAlertType = alertResult.shouldAlert ? riskToAlertType[alertResult.level] || 'moderate' : 'optimal';
    const settings = localStorage.getItem('climateAppSettings');
    const soundEnabled = settings ? JSON.parse(settings).soundAlerts !== false : true;

    if (
      soundEnabled &&
      alertResult.shouldAlert
    ) {
      const uvLabel =
        weatherData.uvIndex == null
          ? 'N/A'
          : weatherData.uvIndex > 11
            ? '11+'
            : weatherData.uvIndex.toFixed(1);

      const rf = risk.realFeel ?? risk.heatIndex ?? weatherData.temperature;

      notificationManager.send({
        channel: 'climate',
        kind: risk.level as any,
        title: `HidroAlly Alert — ${risk.message}`,
        body: `${risk.description} (RealFeel ${rf.toFixed(1)}°C, Humidity ${weatherData.humidity.toFixed(0)}%, UV ${uvLabel})`,
        dedupKey: `climate:${risk.level}:${new Date().toISOString().slice(0, 13)}`,
        url: '/climate',
        toastVariant: risk.level === 'extreme' || risk.level === 'high' ? 'destructive' : 'default',
      });
    }

    this.lastAlertType = currentAlertType;
    localStorage.setItem('climateLastAlertType', currentAlertType);
  }

  cleanup(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}

export const climateAlertService = ClimateAlertService.getInstance();
