import React, { useEffect, useState } from 'react';
import { notificationManager } from '@/services/NotificationManager';

export const NotificationPermissionModal = () => {
  const [show, setShow] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'default' | 'granted' | 'denied'>('default');

  useEffect(() => {
    if (typeof Notification === 'undefined') return;

    // Check initial permission status
    const checkPermission = async () => {
      const status = Notification.permission as 'default' | 'granted' | 'denied';
      setPermissionStatus(status);

      // FIXED: Show modal IMMEDIATELY if permission not yet requested
      // Don't wait 2 seconds on Android - it gets missed
      if (status === 'default') {
        console.log('🔔 Permission not yet requested - showing modal');
        // Show after very short delay (just enough for page to render)
        const timer = setTimeout(() => {
          setShow(true);
        }, 500);
        return () => clearTimeout(timer);
      } else if (status === 'denied') {
        console.warn('❌ Notifications denied by user');
        // Don't show modal for denied - user chose not to
      } else if (status === 'granted') {
        console.log('✅ Notifications already granted');
        // Ensure service worker is registered even if permission already granted
        await notificationManager.requestPermission();
      }
    };

    checkPermission();
  }, []);

  const handleEnable = async () => {
    try {
      console.log('🔔 Requesting notification permission...');
      const granted = await notificationManager.requestPermission();
      
      if (granted) {
        console.log('✅ Permission granted! Service Worker ready.');
        setPermissionStatus('granted');
      } else {
        console.warn('❌ Permission denied');
        setPermissionStatus('denied');
      }
      setShow(false);
    } catch (e) {
      console.error('❌ Notification permission error:', e);
    }
  };

  const handleDismiss = () => {
    console.log('⏭️ User dismissed notification modal');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-cyan-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">

        <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🔔</span>
        </div>

        <h2 className="text-xl font-bold text-white text-center mb-2">
          Stay Protected
        </h2>

        <p className="text-gray-400 text-center text-sm mb-2 leading-relaxed">
          SweatSmart sends you critical alerts:
        </p>

        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-3 bg-gray-800/60 rounded-xl p-3">
            <span className="text-xl">🌡️</span>
            <div>
              <p className="text-white text-sm font-semibold">Climate Alerts</p>
              <p className="text-gray-500 text-xs">Real-time warnings when heat/humidity is dangerous</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gray-800/60 rounded-xl p-3">
            <span className="text-xl">📋</span>
            <div>
              <p className="text-white text-sm font-semibold">Episode Reminders</p>
              <p className="text-gray-500 text-xs">Scheduled reminders to log your sweat episodes</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-cyan-400/70 bg-cyan-500/10 rounded-lg p-2 mb-4 text-center">
          ⚠️ Notifications work ONLY if you enable them here
        </p>

        <div className="space-y-3">
          <button
            onClick={handleEnable}
            className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-black font-bold rounded-xl transition-all duration-200 text-sm"
          >
            ✓ Enable Alerts
          </button>
          <button
            onClick={handleDismiss}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-400 font-medium rounded-xl transition text-sm"
          >
            Maybe Later
          </button>
        </div>

        <p className="text-xs text-gray-600 text-center mt-4">
          Go to Settings → Apps → SweatSmart → Notifications to manage alerts
        </p>
      </div>
    </div>
  );
};

export default NotificationPermissionModal;
