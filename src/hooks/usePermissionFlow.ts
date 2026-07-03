import { useState, useCallback } from 'react';
import { webPushService } from '@/services/WebPushService';

export type PermissionStep = 'idle' | 'notification-request' | 'notification-guidance' | 'location-request' | 'location-guidance' | 'complete';

export const usePermissionFlow = () => {
  const [step, setStep] = useState<PermissionStep>('idle');
  const [isOpen, setIsOpen] = useState(false);

  const startNotificationFlow = useCallback(async () => {
    setStep('notification-request');

    if (typeof Notification === 'undefined') {
      console.warn('Notification API not supported on this device');
      setStep('complete');
      return 'unsupported';
    }

    const notifStatus = Notification.permission;

    if (notifStatus === 'default') {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        await webPushService.subscribe();
        return 'granted';
      } else {
        setStep('notification-guidance');
        setIsOpen(true);
        return 'denied';
      }
    } else if (notifStatus === 'denied') {
      setStep('notification-guidance');
      setIsOpen(true);
      return 'denied';
    } else {
      await webPushService.subscribe();
      return 'granted';
    }
  }, []);

  const startLocationFlow = useCallback(async () => {
    setStep('location-request');

    if (!('geolocation' in navigator)) {
      setStep('complete');
      return 'unsupported';
    }

    try {
      const geoPerm = await navigator.permissions.query({ name: 'geolocation' });
      if (geoPerm.state === 'denied') {
        setStep('location-guidance');
        setIsOpen(true);
        return 'denied';
      }
    } catch (e) {}

    return new Promise<'granted' | 'denied'>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          setStep('complete');
          resolve('granted');
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setStep('location-guidance');
            setIsOpen(true);
            resolve('denied');
          } else {
            setStep('complete');
            resolve('denied');
          }
        },
        { enableHighAccuracy: false, timeout: 5000 }
      );
    });
  }, []);

  const dismiss = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    step,
    setStep,
    isOpen,
    setIsOpen,
    startNotificationFlow,
    startLocationFlow,
    dismiss
  };
};
