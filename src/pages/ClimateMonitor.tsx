import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PageTransition from "@/components/layout/PageTransition";
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
import { useEngagement } from '@/hooks/useEngagement';

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

const WEATHER_REFRESH_INTERVAL = 15 * 60 * 1000;

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
    return "text-[#d4ff00]";
  }, []);

  const getLastUpdatedText = () => {
    if (!weather.lastUpdated) return null;
    const diff = Math.floor((Date.now() - weather.lastUpdated) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const displayUV = weather.uvIndex == null ? null : Math.min(11, weather.uvIndex);
  const realFeelVal = weather.realFeel ?? weather.heatIndex ?? weather.temperature;
  const dewPointVal = weather.dewPoint;

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
        {/* Temperature & RealFeel */}
        <div className="bg-black/20 border border-white/10 p-4 rounded-xl text-center">
          <ThermometerIcon className="w-12 h-12 mx-auto mb-2" />
          <p className="text-2xl font-bold text-amber-300">{weather.temperature.toFixed(1)}°C</p>
          <p className="text-xs text-purple-200/90 font-medium mt-1">RealFeel: {realFeelVal.toFixed(1)}°C</p>
        </div>
        {/* Humidity & Dew Point */}
        <div className="bg-black/20 border border-white/10 p-4 rounded-xl text-center">
          <DropletIcon className="w-12 h-12 mx-auto mb-2" />
          <p className="text-2xl font-bold text-sky-300">{weather.humidity.toFixed(0)}%</p>
          <p className="text-xs text-purple-200/90 font-medium mt-1">
            {dewPointVal != null ? `Dew Point: ${dewPointVal.toFixed(1)}°C` : 'Humidity'}
          </p>
        </div>
        {/* UV Index */}
        <div className="bg-black/20 border border-white/10 p-4 rounded-xl text-center">
          <UVSunIcon className="w-12 h-12 mx-auto mb-2" />
          <p className="text-2xl font-bold text-yellow-300">
            {displayUV != null ? displayUV.toFixed(1) : 'N/A'}
          </p>
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
        <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg px-4 py-2 text-center">
          <p className="text-xs text-blue-400">⚠️ EDA stale or simulated — climate data only used for alert severity</p>
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
  locationPermission: 'prompt' | 'granted' | 'denied';
  notificationPermission: 'prompt' | 'granted' | 'denied';
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
  const { trackAction } = useEngagement();
  const [notificationPermission, setNotificationPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [locationPermission, setLocationPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [lastWeatherFetch, setLastWeatherFetch] = useState<number | null>(null);
  const [physiologicalData, setPhysiologicalData] = useState<PhysiologicalData>({ eda: 2.5 });
  const [alertStatus, setAlertStatus] = useState("Waiting for real weather data...");
  const [lastAlertType, setLastAlertType] = useState<string | null>(() =>
    localStorage.getItem('climateLastAlertType')
  );

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
    } else if (typeof Notification !== 'undefined') {
      const perm = Notification.permission;
      setNotificationPermission(perm === 'default' ? 'prompt' : perm);
    }
  }, []);

  useEffect(() => {
    trackAction("climate_alert_checks");
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
  }, [checkPermissions, trackAction]);

  useEffect(() => {
    const storedEDA = edaManager.getEDA();
    if (storedEDA && edaManager.isFresh()) {
      setPhysiologicalData({ eda: storedEDA.value });
    }
  }, []);

  const fetchWeatherData = useCallback(async (coords: GeolocationCoordinates, bypassCache = false) => {
    setIsFetchingWeather(true);
    setWeatherError(null);
    try {
      const { data, error } = await supabase.functions.invoke('get-weather-data', {
        body: { latitude: coords.latitude, longitude: coords.longitude, bypassCache }
      });
      if (error) throw new Error(error.message);
      if (data.simulated) throw new Error(data.error || 'Weather API unavailable — no real data received.');
      const now = Date.now();
      setWeatherData({ ...data, uvIndex: data.uvIndex ?? data.uvi ?? null, lastUpdated: now });
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

    if (
      soundEnabled &&
      (risk.level === 'high' || risk.level === 'extreme')
    ) {
      const uvLabel =
        weatherData.uvIndex == null
          ? 'N/A'
          : weatherData.uvIndex > 11
            ? '11+'
            : weatherData.uvIndex.toFixed(1);
      void sendClimateAlert(
        `HidroAlly Alert — ${risk.message}`,
        `${risk.description} (RealFeel ${weatherData.realFeel?.toFixed(1) ?? weatherData.temperature.toFixed(1)}°C, Humidity ${weatherData.humidity.toFixed(0)}%, UV ${uvLabel})`,
        risk.level as 'high' | 'extreme',
        `climate:${risk.level}:${new Date().toISOString().slice(0, 13)}`,
      );
    }

    localStorage.setItem('climateLastAlertType', currentAlertType);
    localStorage.setItem('climateLastAlertTimestamp', Date.now().toString());
    setLastAlertType(currentAlertType);
  }, [weatherData, sendClimateAlert, arePermissionsGranted, lastAlertType, hasRealWeather]);

  return (
    <PageTransition>
      <div className="min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden bg-slate-900 p-6 space-y-6 relative">

        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-slate-800/50 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-slate-800/50 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 space-y-6 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col relative w-full overflow-hidden mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (window.history.length > 2) {
                      navigate(-1);
                    } else {
                      navigate('/home');
                    }
                  }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-white/5 border border-white/10 shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/70">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                </button>
                <div className="flex-1 min-w-0">
                  <h1 className="text-[20px] leading-tight font-extrabold text-[#22c55e] tracking-tight">HidroAlly Climate Alerts</h1>
                  <p className="text-[13px] leading-snug font-medium text-[#4ade80] mt-0.5">
                    Real-time weather monitoring and personalized alerts
                  </p>
                </div>
              </div>
              {location && (
                <Button
                  className="bg-white/20 border border-white/30 text-white hover:bg-white/30 transition-colors shadow-none shrink-0"
                  onClick={() => fetchWeatherData(location, true)}
                  disabled={isFetchingWeather}
                >
                  <RefreshIcon className={`h-4 w-4 mr-2 ${isFetchingWeather ? 'animate-spin' : ''}`} />
                  {isFetchingWeather ? 'Refreshing...' : 'Refresh'}
                </Button>
              )}
            </div>
          </div>

          <div className={`space-y-6 transition-opacity duration-500 ${arePermissionsGranted ? 'opacity-100' : 'opacity-40 blur-sm'}`}>
            {weatherError && (
              <WeatherErrorCard error={weatherError} onRetry={() => location && fetchWeatherData(location, true)} isFetching={isFetchingWeather} />
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
                      <span className="text-xs bg-[#d4ff00]/10 text-[#d4ff00] px-3 py-1 rounded-full border border-[#d4ff00]/30">Simulated — not used for alerts</span>
                    );
                    if (storedEDA && !isFresh) return (
                      <span className="text-xs bg-[#d4ff00]/10 text-[#d4ff00] px-3 py-1 rounded-full border border-[#d4ff00]/30">Stale • Generate new</span>
                    );
                    return <span className="text-xs bg-white/10 text-purple-200 px-3 py-1 rounded-full border border-white/20">No data</span>;
                  })()}
                </div>
              </div>
              <button
                onClick={() => {
                  const eda = physiologicalData.eda;
                  const mode = eda > 10 ? 'Trigger' : eda > 5 ? 'Active' : 'Resting';
                  navigate(`/palm-scanner?mode=${mode}`);
                }}
                className="w-full py-3 bg-white/20 hover:bg-white/30 border border-white/30 backdrop-blur-md rounded-xl transition-colors font-semibold flex items-center justify-center gap-2 text-white"
              >
                <ZapIcon className="w-5 h-5" /> Go to Scanner
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
    </PageTransition>
  );
};

export default ClimateMonitor;
