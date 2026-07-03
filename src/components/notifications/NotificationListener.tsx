import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { loggingReminderService } from '@/services/LoggingReminderService';
import { notificationManager } from '@/services/NotificationManager';
import { climateAlertService } from '@/services/ClimateAlertService';
import { audioAlertPlayer, type AlertKind } from '@/utils/audioAlertPlayer';
import { attachNativeTapHandler } from '@/services/NativeNotificationBridge';

type InAppNotificationDetail = {
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'destructive';
};

const NotificationListener = () => {
  const navigate = useNavigate();
  useEffect(() => {
    console.log('🔔 NotificationListener: Initializing global notification services...');

    notificationManager;
    loggingReminderService.forceCheck();
    climateAlertService.initialize();
    // On Android/iOS: request OS-level notification permission and wire taps
    void notificationManager.requestNativePermissionsIfAvailable();
    void attachNativeTapHandler((url) => navigate(url));

    // Listen for Service Worker messages (Background PUSH wake-ups)
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PLAY_NOTIFICATION_SOUND') {
        const kind = (event.data.kind || 'reminder') as AlertKind;
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
      loggingReminderService.cleanup();
      climateAlertService.cleanup();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, []);

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
