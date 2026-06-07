import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { edaManager } from '@/utils/edaManager';
import type { WeatherData, PhysiologicalData, Thresholds, LogEntry, HDSSLevel } from "@/types";
import { soundManager } from '@/utils/soundManager';
import { calculateSweatRisk, getRiskSeverity, type SweatRiskLevel } from '@/utils/sweatRiskCalculator';
import { notificationManager } from '@/services/NotificationManager';
import { loggingReminderService } from '@/services/LoggingReminderService';
import { useToast } from '@/hooks/use-toast';

// --- Realistic Icons matching Gemini mockup ---

const ThermometerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="6" width="8" height="24" rx="4" fill="#f59e0b" opacity="0.3"/>
    <rect x="20" y="6" width="8" height="24" rx="4" stroke="#f59e0b" strokeWidth="2"/>
    <rect x="22" y="14" width="4" height="14" rx="2" fill="#f59e0b"/>
    <circle cx="24" cy="36" r="7" fill="#ef4444" stroke="#f87171" strokeWidth="1.5"/>
    <circle cx="24" cy="36" r="4" fill="#fca5a5"/>
    <line x1="28" y1="12" x2="32" y2="12" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="28" y1="17" x2="31" y2="17" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="28" y1="22" x2="32" y2="22" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const DropletIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 6 C24 6 10 20 10 30 C10 38 16.3 44 24 44 C31.7 44 38 38 38 30 C38 20 24 6 24 6Z"
      fill="#38bdf8" opacity="0.35"/>
    <path d="M24 6 C24 6 10 20 10 30 C10 38 16.3 44 24 44 C31.7 44 38 38 38 30 C38 20 24 6 24 6Z"
      stroke="#38bdf8" strokeWidth="2" fill="none"/>
    <path d="M18 32 C18 28 21 25 24 24" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
  </svg>
);

const UVSunIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="10" fill="#facc15" opacity="0.9"/>
    <circle cx="24" cy="24" r="7" fill="#fde68a"/>
    {[0,45,90,135,180,225,270,315].map((angle, i) => {
      const rad = (angle * Math.PI) / 180;
      const x1 = 24 + 12 * Math.cos(rad);
      const y1 = 24 + 12 * Math.sin(rad);
      const x2 = 24 + 17 * Math.cos(rad);
      const y2 = 24 + 17 * Math.sin(rad);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#facc15" strokeWidth="2" strokeLinecap="round"/>;
    })}
    <circle cx="34" cy="14" r="8" fill="#7c3aed"/>
    <text x="34" y="18" textAnchor="middle" fontSize="7" fontWeight="bold" fill="white">UV</text>
  </svg>
);

const SweatingHandIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 28 L14 18 C14 16.3 15.3 15 17 15 C18.7 15 20 16.3 20 18 L20 24"
      stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <path d="M20 22 C20 20.3 21.3 19 23 19 C24.7 19 26 20.3 26 22 L26 24"
      stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <path d="M26 23 C26 21.3 27.3 20 29 20 C30.7 20 32 21.3 32 23 L32 28"
      stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <path d="M14 28 C14 28 13 32 13 35 C13 38 15 40 18 40 L30 40 C33 40 35 38 35 35 L35 28 C35 26.3 33.7 25 32 25"
      stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <circle cx="22" cy="12" r="2" fill="#7dd3fc" opacity="0.8"/>
    <circle cx="28" cy="9" r="1.5" fill="#7dd3fc" opacity="0.6"/>
    <circle cx="35" cy="14" r="1.5" fill="#7dd3fc" opacity="0.6"/>
    <path d="M22 12 L22 16" stroke="#7dd3fc" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
  </svg>
);

const BellIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);
const MapPinIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const RefreshIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356-2A8.001 8.001 0 004 12c0 2.127.766 4.047 2.031 5.488M16 20v-5h.582m-15.356 2A8.001 8.001 0 0020 12c0-2.127-.766-4.047-2.031-5.488" />
  </svg>
);
const ZapIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const TESTING_MODE = false;
const LOG_CHECK_INTERVAL = 30000;
const WEATHER_REFRESH_INTERVAL = 15 * 60 * 1000;

type PermissionStatus = 'prompt' | 'granted' | 'denied';

const PermissionsWizard: React.FC<{
  locationStatus: PermissionStatus;
  notificationStatus: PermissionStatus;
  onRequestLocation: () => void;
  onRequestNotification: () => void;
  onCheckPermissions: () => void;
}> = ({ locationStatus, notificationStatus, onRequestLocation, onRequestNotification, onCheckPermissions }) => {
  const isBlocked = locationStatus === 'denied' || notificationStatus === 'denied';
  return (
    <div className="bg-white/10 backdrop-blur-xl border border-white/20 text-white p-6 rounded-xl space-y-4">
      <h3 className="text-2xl font-bold text-white">Setup Required</h3>
      <p className="text-purple-200">SweatSmart needs location and notification permissions for real-time alerts.</p>
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between bg-black/20 p-4 rounded-lg">
          <div className="flex items-center space-x-3">
            <MapPinIcon className={`w-6 h-6 ${locationStatus === 'granted' ? 'text-green-400' : 'text-blue-400'}`} />
            <span className="font-semibold">Local Weather</span>
          </div>
          {locationStatus === 'granted' && <span className="text-sm font-bold text-green-400">Enabled</span>}
          {locationStatus === 'prompt' && (
            <button onClick={onRequestLocation} className="bg-blue-500 text-white text-sm font-bold px-4 py-2 rounded-md hover:bg-blue-400 transition">Enable Location</button>
          )}
          {locationStatus === 'denied' && <span className="text-sm font-bold text-red-400">Blocked</span>}
        </div>
        <div className="flex items-center justify-between bg-black/20 p-4 rounded-lg">
          <div className="flex items-center space-x-3">
            <BellIcon className={`w-6 h-6 ${notificationStatus === 'granted' ? 'text-green-400' : 'text-yellow-400'}`} />
            <span className="font-semibold">Climate Alerts</span>
          </div>
          {notificationStatus === 'granted' && <span className="text-sm font-bold text-green-400">Enabled</span>}
          {notificationStatus === 'prompt' && (
            <button onClick={onRequestNotification} disabled={locationStatus !== 'granted'}
              className="bg-yellow-500 text-black text-sm font-bold px-4 py-2 rounded-md hover:bg-yellow-400 transition disabled:bg-gray-600">
              Enable Notifications
            </button>
          )}
          {notificationStatus === 'denied' && <span className="text-sm font-bold text-red-400">Blocked</span>}
        </div>
      </div>
      {isBlocked && (
        <div className="bg-red-900/50 border border-red-700 p-4 rounded-lg">
          <p className="text-sm text-red-200 mb-3">Permissions blocked. Update them in your browser site settings.</p>
          <button onClick={onCheckPermissions} className="flex items-center gap-2 bg-gray-200 text-black font-bold px-4 py-2 rounded-md hover:bg-white transition text-sm">
            <RefreshIcon className="w-4 h-4" /> Check Permissions
          </button>
        </div>
      )}
    </div>
  );
};

const WeatherErrorCard: React.FC<{ error: string; onRetry: () => void; isFetching: boolean }> = ({ error, onRetry, isFetching }) => (
  <div className="bg-white/10 backdrop-blur-xl border border-red-400/40 rounded-xl p-6 text-center space-y-3">
    <p className="text-red-300 font-semibold">⚠️ Could not fetch real weather data</p>
    <p className="text-purple-200 text-sm">{error}</p>
    <p className="text-purple-200/60 text-xs">No alerts will fire until real data is available.</p>
    <Button onClick={onRetry} disabled={isFetching} className="bg-white/20 hover:bg-white/30 text-white border border-white/30">
      <RefreshIcon className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
      {isFetching ? 'Retrying...' : 'Retry'}
    </Button>
  </div>
);

const CurrentStatusCard: React.FC<{
  weather: WeatherData;
  physiological: PhysiologicalData;
  alertStatus: string;
  isFetching: boolean;
  edaIsWearableAndFresh: boolean;
}> = ({ weather, physiological, alertStatus, isFetching, edaIsWearableAndFresh }) => {
  const statusColor = useMemo(() => {
    if (alertStatus.includes("Extreme Risk")) return "text-red-400";
    if (alertStatus.includes("High Risk")) return "text-red-300";
    if (alertStatus.includes("Moderate Risk")) return "text-yellow-300";
    if (alertStatus.includes("Low Risk")) return "text-yellow-200";
    return "text-green-400";
  }, [alertStatus]);

  const getLastUpdatedText = () => {
    if (!weather.lastUpdated) return null;
    const diff = Math.floor((Date.now() - weather.lastUpdated) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const displayUV = Math.min(11, weather.uvIndex);

  return (
    <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6 space-y-4 shadow-2xl">
      {isFetching && (
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded-xl z-10">
          <p className="text-white font-semibold animate-pulse">Fetching real weather data...</p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-[#d4ff00]">Current Status</h3>
        <div className="flex items-center gap-2">
          {weather.location && <span className="text-xs text-purple-200 bg-white/10 px-2 py-1 rounded-full">{weather.location}</span>}
          {weather.lastUpdated && (
            <span className="text-xs text-purple-200 bg-white/10 px-2 py-1 rounded-full">🔄 {getLastUpdatedText()}</span>
          )}
          <span className="text-xs text-green-300 bg-green-500/20 border border-green-400/30 px-2 py-1 rounded-full">✅ Real</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Temperature */}
        <div className="bg-black/20 border border-white/10 p-4 rounded-xl text-center">
          <ThermometerIcon className="w-12 h-12 mx-auto mb-2" />
          <p className="text-2xl font-bold text-amber-300">{weather.temperature.toFixed(1)}°C</p>
          <p className="text-xs text-purple-200/70 mt-1">Temperature</p>
        </div>
        {/* Humidity */}
        <div className="bg-black/20 border border-white/10 p-4 rounded-xl text-center">
          <DropletIcon className="w-12 h-12 mx-auto mb-2" />
          <p className="text-2xl font-bold text-sky-300">{weather.humidity.toFixed(0)}%</p>
          <p className="text-xs text-purple-200/70 mt-1">Humidity</p>
        </div>
        {/* UV Index */}
        <div className="bg-black/20 border border-white/10 p-4 rounded-xl text-center">
          <UVSunIcon className="w-12 h-12 mx-auto mb-2" />
          <p className="text-2xl font-bold text-yellow-300">{displayUV.toFixed(1)}</p>
          <p className="text-xs text-purple-200/70 mt-1">UV Index</p>
        </div>
        {/* EDA */}
        <div className="bg-black/20 border border-white/10 p-4 rounded-xl text-center">
          <SweatingHandIcon className="w-12 h-12 mx-auto mb-2" />
          <p className="text-2xl font-bold text-sky-300">{physiological.eda.toFixed(1)} µS</p>
          <p className="text-xs text-purple-200/70 mt-1">EDA</p>
        </div>
      </div>

      {!edaIsWearableAndFresh && (
        <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg px-4 py-2 text-center">
          <p className="text-xs text-yellow-300">⚠️ EDA stale or simulated — climate data only used for alert severity</p>
        </div>
      )}
      {weather.description && (
        <p className="text-center text-sm text-purple-200 capitalize">{weather.description}</p>
      )}
      <div className={`bg-black/20 border border-white/10 p-4 rounded-lg text-center ${statusColor}`}>
        <p className="text-lg font-semibold">{alertStatus}</p>
      </div>
    </div>
  );
};

const DiagnosticsPanel: React.FC<{
  locationPermission: PermissionStatus;
  notificationPermission: PermissionStatus;
  lastWeatherFetch: number | null;
  edaIsWearableAndFresh: boolean;
}> = ({ locationPermission, notificationPermission, lastWeatherFetch, edaIsWearableAndFresh }) => {
  const fmt = (ts: number | null) =>
    ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
  return (
    <div className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-2">
      <p className="text-xs font-bold text-purple-200/60 uppercase tracking-wider">Diagnostics</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-purple-200/60">Location permission:</span>
        <span className={locationPermission === 'granted' ? 'text-green-400' : 'text-red-400'}>{locationPermission}</span>
        <span className="text-purple-200/60">Notification permission:</span>
        <span className={notificationPermission === 'granted' ? 'text-green-400' : 'text-red-400'}>{notificationPermission}</span>
        <span className="text-purple-200/60">Last weather fetch:</span>
        <span className="text-white">{fmt(lastWeatherFetch)}</span>
        <span className="text-purple-200/60">EDA source:</span>
        <span className={edaIsWearableAndFresh ? 'text-green-400' : 'text-yellow-400'}>
          {edaIsWearableAndFresh ? 'Wearable (fresh)' : 'Simulated / stale'}
        </span>
      </div>
    </div>
  );
};

const ClimateMonitor = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notificationPermission, setNotificationPermission] = useState<PermissionStatus>('prompt');
  const [locationPermission, setLocationPermission] = useState<PermissionStatus>('prompt');
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [lastWeatherFetch, setLastWeatherFetch] = useState<number | null>(null);
  const [physiologicalData, setPhysiologicalData] = useState<PhysiologicalData>({ eda: 2.5 });
  const [thresholds, setThresholds] = useState<Thresholds>(() => {
    const saved = localStorage.getItem('sweatSmartThresholds');
    return saved ? JSON.parse(saved) : { temperature: 28, humidity: 70, uvIndex: 6 };
  });
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    const saved = localStorage.getItem('sweatSmartLogs');
    return saved ? JSON.parse(saved) : [];
  });
  const [nextLogTime, setNextLogTime] = useState<number | null>(null);
  const [alertStatus, setAlertStatus] = useState("Waiting for real weather data...");
  const [lastAlertType, setLastAlertType] = useState<string | null>(() =>
    localStorage.getItem('climateLastAlertType')
  );
  const [lastLogTime, setLastLogTime] = useState<number | null>(() => {
    const s = localStorage.getItem('sweatsmart_last_log_time');
    return s ? parseInt(s, 10) : null;
  });

  const edaIsWearableAndFresh = edaManager.isWearableAndFresh();
  const arePermissionsGranted = locationPermission === 'granted' && notificationPermission === 'granted';
  const hasRealWeather = weatherData !== null && !weatherError;

  const checkPermissions = useCallback(async () => {
    if ('permissions' in navigator) {
      const [notifStatus, geoStatus] = await Promise.all([
        navigator.permissions.query({ name: 'notifications' }),
        navigator.permissions.query({ name: 'geolocation' })
      ]);
      setNotificationPermission(notifStatus.state);
      setLocationPermission(geoStatus.state);
      notifStatus.onchange = () => setNotificationPermission(notifStatus.state);
      geoStatus.onchange = () => setLocationPermission(geoStatus.state);
    } else {
      const perm = Notification.permission;
      setNotificationPermission(perm === 'default' ? 'prompt' : perm);
    }
  }, []);

  useEffect(() => {
    checkPermissions();
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(position.coords);
          setLocationPermission('granted');
        },
        (error) => {
          console.warn('📍 Geolocation error:', error);
          if (error.code === error.PERMISSION_DENIED) {
            setLocationPermission('denied');
          } else if (error.code === error.TIMEOUT) {
            setWeatherError('Location request timed out. Please ensure GPS is on and try refreshing.');
          }
        },
        { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
      );
    }
  }, [checkPermissions]);

  useEffect(() => {
    const storedEDA = edaManager.getEDA();
    if (storedEDA && edaManager.isFresh()) {
      setPhysiologicalData({ eda: storedEDA.value });
    }
  }, []);

  useEffect(() => { localStorage.setItem('sweatSmartThresholds', JSON.stringify(thresholds)); }, [thresholds]);
  useEffect(() => { localStorage.setItem('sweatSmartLogs', JSON.stringify(logs)); }, [logs]);

  const fetchWeatherData = useCallback(async (coords: GeolocationCoordinates) => {
    setIsFetchingWeather(true);
    setWeatherError(null);
    try {
      const { data, error } = await supabase.functions.invoke('get-weather-data', {
        body: { latitude: coords.latitude, longitude: coords.longitude }
      });
      if (error) throw new Error(error.message);
      if (data.simulated) throw new Error(data.error || 'Weather API unavailable — no real data received.');
      const now = Date.now();
      setWeatherData({ ...data, uvIndex: data.uvIndex ?? data.uvi ?? 0, lastUpdated: now });
      setLastWeatherFetch(now);
      setWeatherError(null);
    } catch (err: any) {
      console.error('🌤️ Weather fetch failed:', err);
      setWeatherError(err.message || 'Could not fetch weather data. Check your connection.');
    } finally {
      setIsFetchingWeather(false);
    }
  }, []);

  useEffect(() => {
    if (location) {
      fetchWeatherData(location);
      const interval = setInterval(() => fetchWeatherData(location), WEATHER_REFRESH_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [location, fetchWeatherData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhysiologicalData(prev => ({ eda: Math.max(0, prev.eda + (Math.random() - 0.45) * 0.5) }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const playAlertSound = useCallback(
    (severity: 'CRITICAL' | 'WARNING' | 'MODERATE' | 'LOW' | 'OPTIMAL' | 'REMINDER' = 'WARNING') => {
      soundManager.triggerMedicalAlert(severity);
    }, []
  );

  // All climate alerts now go through the central NotificationManager so they
  // share dedup/cooldown with reminders and never collide.
  const sendClimateAlert = useCallback(
    async (
      title: string,
      body: string,
      kind: 'low' | 'moderate' | 'high' | 'extreme',
      dedupKey: string,
    ) => {
      await notificationManager.send({
        channel: 'climate',
        kind,
        title,
        body,
        dedupKey,
        url: '/climate',
        toastVariant: kind === 'extreme' || kind === 'high' ? 'destructive' : 'default',
      });
    },
    [],
  );

  useEffect(() => {
    if (!arePermissionsGranted) { setAlertStatus("Complete setup to begin."); return; }
    if (!hasRealWeather || !weatherData) { setAlertStatus("Waiting for real weather data..."); return; }

    const settings = localStorage.getItem('climateAppSettings');
    const soundEnabled = settings ? JSON.parse(settings).soundAlerts !== false : true;
    // Pass UV through unmodified — calculator handles 11+ correctly.
    const risk = calculateSweatRisk(
      weatherData.temperature,
      weatherData.humidity,
      weatherData.uvIndex,
      0,
      false,
      (weatherData as any).sky ?? 'unknown',
    );

    const riskToAlertType: Record<SweatRiskLevel, string> = {
      safe: 'optimal', low: 'optimal', moderate: 'moderate', high: 'high', extreme: 'extreme',
    };
    const currentAlertType = riskToAlertType[risk.level];

    setAlertStatus(`${risk.message}: ${risk.description}`);

    // Fire alerts on real escalations (not safe/low).
    // We let notificationManager handle the 30min cooldown via dedupKey,
    // so we can re-attempt delivery every time the weather data refreshes (15m).
    if (
      soundEnabled &&
      currentAlertType !== 'optimal'
    ) {
      const uvLabel =
        weatherData.uvIndex == null
          ? 'N/A'
          : weatherData.uvIndex > 11
            ? '11+'
            : weatherData.uvIndex.toFixed(1);
      void sendClimateAlert(
        `SweatSmart Alert — ${risk.message}`,
        `${risk.description} (Temp ${weatherData.temperature.toFixed(1)}°C, Humidity ${weatherData.humidity.toFixed(0)}%, UV ${uvLabel})`,
        risk.level as 'low' | 'moderate' | 'high' | 'extreme',
        `climate:${risk.level}:${new Date().toISOString().slice(0, 13)}`,
      );
    }

    localStorage.setItem('climateLastAlertType', currentAlertType);
    localStorage.setItem('climateLastAlertTimestamp', Date.now().toString());
    setLastAlertType(currentAlertType);
  }, [weatherData, sendClimateAlert, arePermissionsGranted, lastAlertType, hasRealWeather]);

  const updateNextLogTime = useCallback((anchor?: number) => {
    const base = anchor ?? (parseInt(localStorage.getItem('sweatsmart_last_log_time') || '0', 10) || Date.now());
    const nextTime = base + 6 * 60 * 60 * 1000;
    setNextLogTime(nextTime);
    localStorage.setItem('climateNextLogTime', nextTime.toString());
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('climateNextLogTime');
    const storedTime = stored ? parseInt(stored, 10) : NaN;
    if (storedTime && storedTime > Date.now()) setNextLogTime(storedTime);
    else updateNextLogTime();
  }, [updateNextLogTime]);

  useEffect(() => {
    const handler = (e: any) => {
      if (arePermissionsGranted && e.detail?.channel === 'reminder') {
        // Navigating to /log-episode is now the default behavior for reminders
        // This handler was originally for the in-app modal on the climate page.
        // We decouple it to follow the new routing logic.
        navigate('/log-episode');
      }
    };
    window.addEventListener('sweatsmart-notification', handler);
    return () => window.removeEventListener('sweatsmart-notification', handler);
  }, [arePermissionsGranted, navigate]);

  // Log reminders are handled globally by LoggingReminderService — we no longer
  // duplicate that loop here. ClimateMonitor only listens for the
  // 'sweatsmart-log-reminder' event to open the in-app logging modal.

  const requestNotificationPermission = async () => {
    if (locationPermission !== 'granted') return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission === 'default' ? 'prompt' : permission);
  };

  const handleRequestLocation = () => {
    setIsFetchingWeather(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(position.coords);
        setLocationPermission('granted');
        if (notificationPermission === 'prompt') requestNotificationPermission();
      },
      (error) => {
        console.warn('📍 handleRequestLocation error:', error);
        if (error.code === error.PERMISSION_DENIED) setLocationPermission('denied');
        else setWeatherError(`Location error: ${error.message}`);
        setIsFetchingWeather(false);
      },
      { enableHighAccuracy: false, timeout: 20000 }
    );
  };

  const handleThresholdChange = (key: keyof Thresholds, value: number) => {
    setThresholds(prev => ({ ...prev, [key]: value }));
  };

  return (
    <AppLayout>
      {/* Warrior Glass background — matches Wearable Simulator */}
      <div className="min-h-full bg-gradient-to-br from-[#2d1b69] via-[#6d28d9] to-[#be185d] p-6 rounded-xl space-y-6 relative overflow-hidden">

        {/* Ambient glow overlays */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#4ade80] drop-shadow-lg">SweatSmart Climate Alerts</h1>
              <p className="text-[#4ade80] mt-1 text-base">Real-time weather monitoring and personalized alerts</p>
            </div>
            {location && (
              <Button
                className="bg-white/20 border border-white/30 text-white hover:bg-white/30 backdrop-blur-md"
                onClick={() => fetchWeatherData(location)}
                disabled={isFetchingWeather}
              >
                <RefreshIcon className={`h-4 w-4 mr-2 ${isFetchingWeather ? 'animate-spin' : ''}`} />
                {isFetchingWeather ? 'Refreshing...' : 'Refresh'}
              </Button>
            )}
          </div>

          {!arePermissionsGranted && (
            <PermissionsWizard
              locationStatus={locationPermission} notificationStatus={notificationPermission}
              onRequestLocation={handleRequestLocation} onRequestNotification={requestNotificationPermission}
              onCheckPermissions={checkPermissions}
            />
          )}

          <div className={`space-y-6 transition-opacity duration-500 ${arePermissionsGranted ? 'opacity-100' : 'opacity-40 blur-sm pointer-events-none'}`}>
            {weatherError && (
              <WeatherErrorCard error={weatherError} onRetry={() => location && fetchWeatherData(location)} isFetching={isFetchingWeather} />
            )}
            {hasRealWeather && weatherData && (
              <CurrentStatusCard weather={weatherData} physiological={physiologicalData} alertStatus={alertStatus} isFetching={isFetchingWeather} edaIsWearableAndFresh={edaIsWearableAndFresh} />
            )}
            {!weatherError && !hasRealWeather && arePermissionsGranted && (
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6 text-center">
                <p className="text-white font-semibold animate-pulse">Fetching real weather data for your location...</p>
              </div>
            )}

            {/* EDA + Palm Scanner */}
            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-200">Electrodermal Activity (EDA)</p>
                    <p className="text-2xl font-bold text-[#d4ff00]">{physiologicalData.eda.toFixed(1)} µS</p>
                  </div>
                  {(() => {
                    const storedEDA = edaManager.getEDA();
                    const isFresh = edaManager.isFresh();
                    if (storedEDA && edaIsWearableAndFresh) return (
                      <span className="text-xs bg-green-500/20 text-green-300 px-3 py-1 rounded-full border border-green-400/40">Fresh • {storedEDA.source}</span>
                    );
                    if (storedEDA && isFresh && !edaIsWearableAndFresh) return (
                      <span className="text-xs bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full border border-yellow-400/40">Simulated — not used for alerts</span>
                    );
                    if (storedEDA && !isFresh) return (
                      <span className="text-xs bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full border border-yellow-400/40">Stale • Generate new</span>
                    );
                    return <span className="text-xs bg-white/10 text-purple-200 px-3 py-1 rounded-full border border-white/20">No data</span>;
                  })()}
                </div>
              </div>
              <button
                onClick={() => {
                  const eda = physiologicalData.eda;
                  const mode = eda > 10 ? 'Trigger' : eda > 5 ? 'Active' : 'Resting';
                  navigate(`/palm-scanner?returnTo=/climate&mode=${mode}`);
                }}
                className="w-full py-3 bg-white/20 hover:bg-white/30 border border-white/30 backdrop-blur-md rounded-xl transition-colors font-semibold flex items-center justify-center gap-2 text-white"
              >
                <ZapIcon className="w-5 h-5" /> Go to Palm Scanner
              </button>
            </div>


            <DiagnosticsPanel
              locationPermission={locationPermission}
              notificationPermission={notificationPermission}
              lastWeatherFetch={lastWeatherFetch}
              edaIsWearableAndFresh={edaIsWearableAndFresh}
            />

          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ClimateMonitor;
