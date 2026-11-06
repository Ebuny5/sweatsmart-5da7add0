import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { loggingReminderService } from '@/services/LoggingReminderService';
import { notificationManager } from '@/services/NotificationManager';
import { climateAlertService } from '@/services/ClimateAlertService';
import { audioAlertPlayer, type AlertKind } from '@/utils/audioAlertPlayer';
import { attachNativeTapHandler } from '@/services/NativeNotificationBridge';
import {
  initializeNativePush,
  requestNativePushPermissionAndRegister,
  setNativePushNavigationHandler,
  syncNativePushContext,
} from '@/services/NativePushService';
import { useAuth } from '@/contexts/AuthContext';
import { webPushService } from '@/services/WebPushService';

type InAppNotificationDetail = {
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'destructive';
};

const NotificationListener = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return; // Only initialize background tasks and ask for permissions if logged in

    console.log('🔔 NotificationListener: Initializing global notification services...');

    notificationManager;
    loggingReminderService.forceCheck();
    climateAlertService.initialize();
    // On Android/iOS: register the device for real FCM/APNs push so reminders and
    // climate alerts arrive while the app is closed (Web Push cannot do that in a
    // native WebView), then request OS-level permission and wire taps.
    setNativePushNavigationHandler((url) => navigate(url));
    void initializeNativePush();
    void notificationManager.requestNativePermissionsIfAvailable().then((granted) => {
      // Once the OS permission is granted, register with FCM/APNs in the same pass
      // so the device token is stored even on first launch.
      if (granted) void requestNativePushPermissionAndRegister();
    });
    void attachNativeTapHandler((url) => navigate(url));

    // Keep the background push subscription linked to this user + location,
    // so closed-app climate alerts work without any setup screen.
    const syncPush = () => {
      webPushService.syncSubscriptionContext().catch((e) => console.warn('Push context sync failed:', e));
      // Keep the native device row bound to this user + location as well.
      syncNativePushContext().catch((e) => console.warn('Native push context sync failed:', e));
    };
    syncPush();
    const syncInterval = setInterval(syncPush, 30 * 60 * 1000);
    const onVisible = () => { if (document.visibilityState === 'visible') syncPush(); };
    document.addEventListener('visibilitychange', onVisible);

    // Listen for Service Worker messages (Background PUSH wake-ups)
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PLAY_NOTIFICATION_SOUND') {
        const supportedKinds: AlertKind[] = ['reminder', 'checkin', 'missed-checkin', 'low', 'moderate', 'high', 'extreme'];
        const candidate = event.data.kind;
        const kind: AlertKind = supportedKinds.includes(candidate) ? candidate : 'reminder';
        if (kind === 'missed-checkin') return;
        console.log(`📱 Background Trigger: Playing voice alert for "${kind}"`);
        audioAlertPlayer.playAlert(kind).catch(err => {
          console.warn('📱 Background audio trigger failed (user interaction required?):', err);
        });
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    return () => {
      setNativePushNavigationHandler(null);
      loggingReminderService.cleanup();
      climateAlertService.cleanup();
      clearInterval(syncInterval);
      document.removeEventListener('visibilitychange', onVisible);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, [user]);

  useEffect(() => {
    const handleInAppNotification = (event: Event) => {
      const detail = (event as CustomEvent<InAppNotificationDetail>).detail;
      if (!detail?.title) return;

      toast({
        title: detail.title,
        description: detail.body,
        variant: detail.type === 'destructive' ? 'destructive' : 'default',
      });
    };

    window.addEventListener('sweatsmart-notification', handleInAppNotification as EventListener);
    return () => {
      window.removeEventListener('sweatsmart-notification', handleInAppNotification as EventListener);
    };
  }, []);

  return null;
};

export default NotificationListener;
