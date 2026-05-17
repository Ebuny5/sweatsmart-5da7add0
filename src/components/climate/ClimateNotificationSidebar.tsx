/**
 * ClimateNotificationSidebar.tsx
 *
 * PATCH A: Duplicate LoggingModal removed.
 * This sidebar now imports and uses <LoggingSystem> from LoggingSystem.tsx
 * instead of defining its own inline LoggingModal.
 *
 * The standalone LoggingModal that was previously in this file has been deleted.
 * Single source of truth: src/components/climate/LoggingSystem.tsx
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
// ✅ Use the shared LoggingSystem — no duplicate LoggingModal here
import { LoggingSystem } from './LoggingSystem';

export interface WeatherData { temperature: number; humidity: number; uvIndex: number; }
export interface PhysiologicalData { eda: number; }
export interface Thresholds { temperature: number; humidity: number; uvIndex: number; }
export type HDSSLevel = 1 | 2 | 3 | 4;
export interface LogEntry { id: string; timestamp: number; hdssLevel: HDSSLevel; weather: WeatherData; physiologicalData: PhysiologicalData; }

const ThermometerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const DropletIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2.25c-3.75 4.5-6 7.5-6 10.5a6 6 0 0012 0c0-3-2.25-6-6-10.5z" /></svg>);
const SunIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h1M3 12H2m15.364 6.364l-.707.707M6.343 6.343l-.707-.707m12.728 0l-.707-.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>);
const ZapIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>);
const BellIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>);
const MapPinIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
const RefreshIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356-2A8.001 8.001 0 004 12c0 2.127.766 4.047 2.031 5.488M16 20v-5h.582m-15.356 2A8.001 8.001 0 0020 12c0-2.127-.766-4.047-2.031-5.488" /></svg>);

const PHYSIOLOGICAL_EDA_THRESHOLD = 5.0;
const LOG_INTERVAL = 6 * 60 * 60 * 1000;
const DATA_SIMULATION_INTERVAL = 5000;
const LOG_CHECK_INTERVAL = 60000;
const WEATHER_REFRESH_INTERVAL = 10 * 60 * 1000;
const NOTIFICATION_COOLDOWN = 30 * 60 * 1000;

type PermissionStatus = 'prompt' | 'granted' | 'denied';

const PermissionsWizard: React.FC<{
  locationStatus: PermissionStatus; notificationStatus: PermissionStatus;
  onRequestLocation: () => void; onRequestNotification: () => void; onCheckPermissions: () => void;
}> = ({ locationStatus, notificationStatus, onRequestLocation, onRequestNotification, onCheckPermissions }) => {
  const isBlocked = locationStatus === 'denied' || notificationStatus === 'denied';
  return (
    <div className="bg-gray-800 border border-cyan-700/50 text-white p-4 rounded-xl flex flex-col items-center text-center space-y-4 shadow-lg">
      <h3 className="text-xl font-bold text-cyan-300">Setup Required</h3>
      <p className="text-sm text-gray-400 max-w-sm">SweatSmart needs location and notification permissions for real-time alerts.</p>
      <div className="w-full space-y-3 pt-2">
        <div className="flex items-center justify-between bg-gray-900/70 p-3 rounded-lg">
          <div className="flex items-center space-x-3">
            <MapPinIcon className={`w-6 h-6 ${locationStatus === 'granted' ? 'text-green-400' : 'text-blue-400'}`} />
            <span className="font-semibold">Local Weather</span>
          </div>
          {locationStatus === 'granted' && <span className="text-sm font-bold text-green-400">Enabled</span>}
          {locationStatus === 'prompt' && <button onClick={onRequestLocation} className="bg-blue-500 text-white text-sm font-bold px-3 py-1 rounded-md hover:bg-blue-400">Enable</button>}
          {locationStatus === 'denied' && <span className="text-sm font-bold text-red-400">Blocked</span>}
        </div>
        <div className="flex items-center justify-between bg-gray-900/70 p-3 rounded-lg">
          <div className="flex items-center space-x-3">
            <BellIcon className={`w-6 h-6 ${notificationStatus === 'granted' ? 'text-green-400' : 'text-yellow-400'}`} />
            <span className="font-semibold">Alerts</span>
          </div>
          {notificationStatus === 'granted' && <span className="text-sm font-bold text-green-400">Enabled</span>}
          {notificationStatus === 'prompt' && <button onClick={onRequestNotification} disabled={locationStatus !== 'granted'} className="bg-yellow-500 text-black text-sm font-bold px-3 py-1 rounded-md hover:bg-yellow-400 disabled:bg-gray-600">Enable</button>}
          {notificationStatus === 'denied' && <span className="text-sm font-bold text-red-400">Blocked</span>}
        </div>
      </div>
      {isBlocked && (
        <div className="bg-red-900/50 border border-red-700 p-3 rounded-lg w-full">
          <p className="text-sm text-red-200 mb-2">Permissions blocked. Update in browser site settings.</p>
          <button onClick={onCheckPermissions} className="flex items-center gap-2 bg-gray-200 text-black font-bold px-3 py-1 rounded-md hover:bg-white text-sm">
            <RefreshIcon className="w-4 h-4" /> Check Again
          </button>
        </div>
      )}
    </div>
  );
};

const CurrentStatusCard: React.FC<{
  weather: WeatherData; physiological: PhysiologicalData;
  alertStatus: string; isFetching: boolean; weatherError: string | null; isSimulated: boolean;
}> = ({ weather, physiological, alertStatus, isFetching, weatherError, isSimulated }) => (
  <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3">
    <div className="flex items-center justify-between">
      <h3 className="text-base font-bold text-amber-400">Current Status</h3>
      {isSimulated && <span className="text-xs text-yellow-400 bg-yellow-900/30 px-2 py-0.5 rounded">⚠️ Simulated</span>}
      {!isSimulated && !weatherError && <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded">✅ Real</span>}
    </div>
    {weatherError && <p className="text-xs text-red-400">{weatherError}</p>}
    <div className="grid grid-cols-2 gap-2">
      <div className="bg-gray-900 p-2 rounded-lg text-center">
        <ThermometerIcon className="w-5 h-5 mx-auto text-red-400 mb-1" />
        <p className="text-lg font-bold text-amber-200">{weather.temperature.toFixed(1)}°C</p>
        <p className="text-xs text-gray-400">Temp</p>
      </div>
      <div className="bg-gray-900 p-2 rounded-lg text-center">
        <DropletIcon className="w-5 h-5 mx-auto text-blue-400 mb-1" />
        <p className="text-lg font-bold text-amber-200">{weather.humidity.toFixed(0)}%</p>
        <p className="text-xs text-gray-400">Humidity</p>
      </div>
      <div className="bg-gray-900 p-2 rounded-lg text-center">
        <SunIcon className="w-5 h-5 mx-auto text-yellow-400 mb-1" />
        <p className="text-lg font-bold text-amber-200">{Math.min(11, weather.uvIndex).toFixed(1)}</p>
        <p className="text-xs text-gray-400">UV</p>
      </div>
      <div className="bg-gray-900 p-2 rounded-lg text-center">
        <ZapIcon className="w-5 h-5 mx-auto text-purple-400 mb-1" />
        <p className="text-lg font-bold text-amber-200">{physiological.eda.toFixed(1)} µS</p>
        <p className="text-xs text-gray-400">EDA</p>
      </div>
    </div>
    <div className="bg-gray-900 p-2 rounded-lg text-center">
      <p className="text-sm font-semibold text-cyan-300">{alertStatus}</p>
    </div>
  </div>
);

const SettingsPanel: React.FC<{ thresholds: Thresholds; onThresholdChange: (k: keyof Thresholds, v: number) => void }> = ({ thresholds, onThresholdChange }) => (
  <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3">
    <h3 className="text-base font-bold text-cyan-300">Alert Thresholds</h3>
    {(['temperature', 'humidity', 'uvIndex'] as (keyof Thresholds)[]).map(key => (
      <div key={key} className="flex items-center justify-between">
        <label className="text-sm text-gray-300 capitalize">{key === 'uvIndex' ? 'UV Index' : key}</label>
        <input type="number" value={thresholds[key]} onChange={e => onThresholdChange(key, Number(e.target.value))}
          className="w-20 bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600" />
      </div>
    ))}
  </div>
);

interface ClimateNotificationSidebarProps { isOpen: boolean; onClose?: () => void; }

const ClimateNotificationSidebar: React.FC<ClimateNotificationSidebarProps> = ({ isOpen, onClose }) => {
  const [notificationPermission, setNotificationPermission] = useState<PermissionStatus>('prompt');
  const [locationPermission, setLocationPermission] = useState<PermissionStatus>('prompt');
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData>({ temperature: 25, humidity: 60, uvIndex: 3 });
  const [physiologicalData, setPhysiologicalData] = useState<PhysiologicalData>({ eda: 2.5 });
  const [thresholds, setThresholds] = useState<Thresholds>({ temperature: 28, humidity: 70, uvIndex: 6 });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoggingModalOpen, setIsLoggingModalOpen] = useState(false);
  const [nextLogTime, setNextLogTime] = useState<number | null>(null);
  const [lastLogTime, setLastLogTime] = useState<number | null>(() => {
    const s = localStorage.getItem('sweatsmart_last_log_time');
    return s ? parseInt(s, 10) : null;
  });
  const [alertStatus, setAlertStatus] = useState("Waiting for data...");
  const lastNotificationRef = useRef<number>(0);
  const arePermissionsGranted = locationPermission === 'granted' && notificationPermission === 'granted';

  const checkPermissions = useCallback(async () => {
    if ('permissions' in navigator) {
      const [n, g] = await Promise.all([
        navigator.permissions.query({ name: 'notifications' }),
        navigator.permissions.query({ name: 'geolocation' })
      ]);
      setNotificationPermission(n.state); setLocationPermission(g.state);
      n.onchange = () => setNotificationPermission(n.state);
      g.onchange = () => setLocationPermission(g.state);
    }
  }, []);

  useEffect(() => { checkPermissions(); }, [checkPermissions]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhysiologicalData(prev => ({ eda: Math.max(0, prev.eda + (Math.random() - 0.45) * 0.5) }));
    }, DATA_SIMULATION_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
    } catch (e) { console.warn('Audio unavailable:', e); }
  }, []);

  const sendNotification = useCallback(async (title: string, body: string) => {
    if ('serviceWorker' in navigator && notificationPermission === 'granted') {
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, {
          body, icon: '/favicon.ico', badge: '/favicon.ico',
          vibrate: [200, 100, 200, 100, 200], requireInteraction: true,
        } as NotificationOptions);
        playNotificationSound();
      } catch (e) { console.error('Notification failed:', e); }
    }
  }, [notificationPermission, playNotificationSound]);

  useEffect(() => {
    if (!arePermissionsGranted) { setAlertStatus("Complete setup to begin."); return; }
    const envTrigger = weatherData.temperature > thresholds.temperature || weatherData.humidity > thresholds.humidity || weatherData.uvIndex > thresholds.uvIndex;
    const physioTrigger = physiologicalData.eda > PHYSIOLOGICAL_EDA_THRESHOLD;
    if (envTrigger && physioTrigger) setAlertStatus("High Risk: Conditions and physiology indicate high sweat risk.");
    else if (envTrigger) setAlertStatus("Moderate Risk: Climate conditions may trigger sweating.");
    else setAlertStatus("Conditions Optimal: Low sweat risk detected.");
    if (envTrigger) {
      const now = Date.now();
      if (now - lastNotificationRef.current > NOTIFICATION_COOLDOWN) {
        lastNotificationRef.current = now;
        sendNotification('SweatSmart Alert', physioTrigger
          ? `High sweat risk! Temp: ${weatherData.temperature.toFixed(1)}°C, Humidity: ${weatherData.humidity.toFixed(0)}%, UV: ${Math.min(11, weatherData.uvIndex).toFixed(1)}`
          : `Climate alert! Temp: ${weatherData.temperature.toFixed(1)}°C, Humidity: ${weatherData.humidity.toFixed(0)}%, UV: ${Math.min(11, weatherData.uvIndex).toFixed(1)}`
        );
      }
    }
  }, [weatherData, physiologicalData, thresholds, sendNotification, arePermissionsGranted]);

  // Next log time anchored to lastLogTime
  const updateNextLogTime = useCallback((anchor?: number) => {
    const base = anchor
      ?? (parseInt(localStorage.getItem('sweatsmart_last_log_time') || '0', 10)
      || Date.now());
    const next = base + LOG_INTERVAL;
    setNextLogTime(next);
    localStorage.setItem('climateNextLogTime', next.toString());
  }, []);

  useEffect(() => {
    updateNextLogTime();
    const interval = setInterval(() => {
      if (nextLogTime && Date.now() >= nextLogTime && arePermissionsGranted) {
        sendNotification('Time to Log', "It's time for your six-hour check-in");
        setIsLoggingModalOpen(true);
        updateNextLogTime();
      }
    }, LOG_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [logs, nextLogTime, sendNotification, updateNextLogTime, arePermissionsGranted]);

  const requestNotificationPermission = async () => {
    if (locationPermission !== 'granted') return;
    const p = await Notification.requestPermission();
    setNotificationPermission(p === 'default' ? 'prompt' : p as PermissionStatus);
  };

  const handleRequestLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation(pos.coords); setLocationPermission('granted'); },
      (err) => { if (err.code === err.PERMISSION_DENIED) setLocationPermission('denied'); }
    );
  };

  const handleLogSubmit = (level: HDSSLevel) => {
    const now = Date.now();
    setLogs(prev => [...prev, { id: new Date().toISOString(), timestamp: now, hdssLevel: level, weather: weatherData, physiologicalData }]);
    localStorage.setItem('sweatsmart_last_log_time', now.toString());
    setLastLogTime(now);
    updateNextLogTime(now);
    setIsLoggingModalOpen(false);
  };

  return (
    <div className={`fixed top-48 right-0 h-[calc(100vh-theme(spacing.48))] w-80 bg-gray-800 text-white shadow-lg z-40 p-4 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-cyan-400">Sweat Smart Climate Alerts</h2>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <div className="space-y-4 overflow-y-auto h-[calc(100%-4rem)] pr-2">
        {!arePermissionsGranted && (
          <PermissionsWizard
            locationStatus={locationPermission} notificationStatus={notificationPermission}
            onRequestLocation={handleRequestLocation} onRequestNotification={requestNotificationPermission}
            onCheckPermissions={checkPermissions}
          />
        )}
        <div className={`transition-opacity duration-500 space-y-4 ${arePermissionsGranted ? 'opacity-100' : 'opacity-40 blur-sm pointer-events-none'}`}>
          <CurrentStatusCard weather={weatherData} physiological={physiologicalData} alertStatus={alertStatus} isFetching={isFetchingWeather} weatherError={weatherError} isSimulated={isSimulated} />
          <SettingsPanel thresholds={thresholds} onThresholdChange={(key, value) => setThresholds(prev => ({ ...prev, [key]: value }))} />
          {/* ✅ Uses shared LoggingSystem — no duplicate LoggingModal */}
          <LoggingSystem
            logs={logs}
            isModalOpen={isLoggingModalOpen}
            onCloseModal={() => setIsLoggingModalOpen(false)}
            onSubmitLog={handleLogSubmit}
            onLogNow={() => setIsLoggingModalOpen(true)}
            nextLogTime={nextLogTime}
            lastLogTime={lastLogTime}
          />
        </div>
      </div>
    </div>
  );
};

export default ClimateNotificationSidebar;
