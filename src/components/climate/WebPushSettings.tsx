import React, { useState, useEffect } from 'react';
import { Bell, BellOff, MapPin, CheckCircle, AlertCircle, Loader2, Send, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { webPushService } from '@/services/WebPushService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Thresholds } from '@/types';
import { usePermissionFlow } from '@/hooks/usePermissionFlow';
import { PermissionGuidanceModal } from '@/components/notifications/PermissionGuidanceModal';

interface WebPushSettingsProps {
  thresholds: Thresholds;
}

export const WebPushSettings: React.FC<WebPushSettingsProps> = ({ thresholds }) => {
  const { user } = useAuth();
  const { startNotificationFlow, startLocationFlow } = usePermissionFlow();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isRefreshingSub, setIsRefreshingSub] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const supported = webPushService.isSupported();
      setIsSupported(supported);

      if (supported) {
        setPermission(webPushService.getPermissionStatus());
        await webPushService.initialize();
        const subscribed = await webPushService.isSubscribed();
        setIsSubscribed(subscribed);
      }
    } catch (error) {
      console.error('Error checking push status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getLocation = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      // Use the unified flow for notifications
      const notifResult = await startNotificationFlow();

      if (notifResult === 'granted') {
        // Also ensure location is granted for weather-based alerts
        const locResult = await startLocationFlow();
        const loc = await getLocation();
        setLocation(loc);

        setIsSubscribed(true);
        setPermission('granted');
        toast.success('Push notifications enabled!', {
          description: 'You\'ll receive alerts even when the app is closed.',
        });
      }
    } catch (error) {
      console.error('Subscribe error:', error);
      toast.error('Failed to subscribe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    try {
      await webPushService.unsubscribe();
      setIsSubscribed(false);
      toast.success('Push notifications disabled');
    } catch (error) {
      console.error('Unsubscribe error:', error);
      toast.error('Failed to unsubscribe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setIsSendingTest(true);
    try {
      const result = await webPushService.sendTestNotification();
      if (result.success) {
        toast.success('Test notification sent!', {
          description: 'Check your notification panel.',
        });
      } else {
        // If the backend reports VAPID mismatch, guide the user to refresh.
        toast.error('Failed to send test notification', {
          description: result.error || 'Unknown error',
        });
      }
    } catch (error) {
      console.error('Test notification error:', error);
      toast.error('Failed to send test', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleRefreshSubscription = async () => {
    setIsRefreshingSub(true);
    try {
      const refreshed = await webPushService.refreshSubscription(
        user?.id,
        location?.lat,
        location?.lng,
        {
          temperature: thresholds.temperature,
          humidity: thresholds.humidity,
          uv: thresholds.uvIndex,
        }
      );

      if (refreshed) {
        setIsSubscribed(true);
        setPermission('granted');
        toast.success('Push subscription refreshed', {
          description: 'Updated to match the latest notification keys.',
        });
      } else {
        toast.error('Failed to refresh subscription', {
          description: 'Try turning notifications off and on again.',
        });
      }
    } catch (error) {
      console.error('Refresh subscription error:', error);
      toast.error('Failed to refresh subscription', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsRefreshingSub(false);
    }
  };

  // Auto-refresh subscription if VAPID keys changed
  useEffect(() => {
    if (!isSupported || !isSubscribed || permission !== 'granted' || !user?.id) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await webPushService.ensureFreshSubscription(user.id, undefined, undefined, {
          temperature: thresholds.temperature,
          humidity: thresholds.humidity,
          uv: thresholds.uvIndex,
        });

        if (cancelled) return;

        if (res.refreshed) {
          toast.success('Push notifications updated', {
            description: 'We refreshed your subscription to match the latest keys.',
          });
          setIsSubscribed(true);
          setPermission('granted');
        }
      } catch (e) {
        // Non-fatal
        console.warn('Auto-refresh push subscription failed:', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSupported, isSubscribed, permission, user?.id, thresholds.temperature, thresholds.humidity, thresholds.uvIndex]);

  // Update thresholds when they change
  useEffect(() => {
    if (isSubscribed) {
      webPushService.updateSettings({
        temperature_threshold: thresholds.temperature,
        humidity_threshold: thresholds.humidity,
        uv_threshold: thresholds.uvIndex,
      });
    }
  }, [thresholds, isSubscribed]);

  if (!isSupported) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center gap-3 text-gray-400">
          <AlertCircle className="w-5 h-5" />
          <div>
            <p className="font-medium">Push notifications not supported</p>
            <p className="text-sm text-gray-500">Your browser doesn't support Web Push notifications.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-4">
      <PermissionGuidanceModal />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <Bell className="w-5 h-5 text-green-400" />
          ) : (
            <BellOff className="w-5 h-5 text-gray-400" />
          )}
          <div>
            <h3 className="text-lg font-bold text-cyan-300">Background Notifications</h3>
            <p className="text-sm text-gray-400">
              Receive alerts even when the app is closed
            </p>
          </div>
        </div>
        
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        ) : (
          <Switch
            checked={isSubscribed}
            onCheckedChange={(checked) => {
              if (checked) {
                handleSubscribe();
              } else {
                handleUnsubscribe();
              }
            }}
          />
        )}
      </div>

      {permission === 'denied' && (
        <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Notifications blocked. Enable them in your browser settings.</span>
        </div>
      )}

      {isSubscribed && (
        <div className="space-y-3 pt-2 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>Push notifications active</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshSubscription}
                disabled={isRefreshingSub || isSendingTest}
                className="text-xs"
              >
                {isRefreshingSub ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3 mr-1" />
                )}
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestNotification}
                disabled={isSendingTest || isRefreshingSub}
                className="text-xs"
              >
                {isSendingTest ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Send className="w-3 h-3 mr-1" />
                )}
                Test
              </Button>
            </div>
          </div>

          {location && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <MapPin className="w-4 h-4" />
              <span>Location-based alerts enabled</span>
            </div>
          )}

          <p className="text-xs text-gray-500">
            You'll be notified when temperature exceeds {thresholds.temperature}°C, 
            humidity exceeds {thresholds.humidity}%, or UV index exceeds {thresholds.uvIndex}.
          </p>
        </div>
      )}
    </div>
  );
};
