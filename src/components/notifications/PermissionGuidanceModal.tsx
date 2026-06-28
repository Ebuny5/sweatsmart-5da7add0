import React, { useEffect } from 'react';
import { Bell, MapPin, Settings, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermissionFlow } from '@/hooks/usePermissionFlow';

const AUTO_PERM_CHECK_KEY = 'sweatsmart_auto_perm_checked';
const ANDROID_SETTINGS_INTENT = 'intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:guru.sweatsmart.twa;end';

export const PermissionGuidanceModal = () => {
  const {
    step,
    setStep,
    isOpen,
    setIsOpen,
    startNotificationFlow,
    startLocationFlow,
    dismiss
  } = usePermissionFlow();

  useEffect(() => {
    const hasChecked = localStorage.getItem(AUTO_PERM_CHECK_KEY);
    if (!hasChecked) {
      initAutoFlow();
    }
  }, []);

  const initAutoFlow = async () => {
    const notifResult = await startNotificationFlow();
    if (notifResult === 'granted') {
      await startLocationFlow();
      const hasChecked = localStorage.getItem(AUTO_PERM_CHECK_KEY);
      if (step === 'complete' || !isOpen) {
         localStorage.setItem(AUTO_PERM_CHECK_KEY, 'true');
      }
    }
    // If denied, the hook will have set isOpen to true and step to guidance
  };

  const handleDismiss = async () => {
    dismiss();
    if (step === 'notification-guidance') {
      await startLocationFlow();
    } else if (step === 'location-guidance' || step === 'complete') {
      localStorage.setItem(AUTO_PERM_CHECK_KEY, 'true');
      setStep('complete');
    }
  };

  const openSettings = () => {
    window.location.href = ANDROID_SETTINGS_INTENT;
  };

  if (!isOpen) return null;

  const isNotif = step === 'notification-guidance';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-300">

        <div className="flex justify-end -mt-2 -mr-2">
          <button onClick={handleDismiss} className="p-2 text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="w-20 h-20 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
          {isNotif ? (
            <Bell className="w-10 h-10 text-primary" />
          ) : (
            <MapPin className="w-10 h-10 text-primary" />
          )}
        </div>

        <h2 className="text-2xl font-black text-white text-center mb-3">
          {isNotif ? 'Enable Notifications' : 'Enable Location'}
        </h2>

        <p className="text-zinc-400 text-center text-sm mb-6 leading-relaxed">
          {isNotif
            ? 'To receive health alerts and reminders, go to Settings and enable notifications for SweatSmart.'
            : 'To receive real-time climate alerts for your area, go to Settings and enable location permissions.'}
        </p>

        <div className="bg-zinc-800/50 rounded-2xl p-4 mb-6 border border-zinc-700/50">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Settings className="w-3 h-3" /> How to enable:
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold">1</div>
              <span>Settings → Apps → SweatSmart</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold">2</div>
              <span>{isNotif ? 'Notifications → Turn ON' : 'Permissions → Location → Allow'}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={openSettings}
            className="w-full py-6 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-sm rounded-2xl shadow-lg shadow-primary/20"
          >
            Open Settings
          </Button>
          <button
            onClick={handleDismiss}
            className="w-full py-3 text-zinc-500 hover:text-zinc-300 font-bold transition text-sm uppercase tracking-wider"
          >
            {isNotif ? 'Continue to Location' : 'Maybe Later'}
          </button>
        </div>

        <div className="mt-6 flex items-center gap-2 justify-center text-[10px] text-zinc-600 font-bold uppercase tracking-tighter">
          <AlertCircle className="w-3 h-3" />
          <span>SweatSmart PWA Warrior Engine</span>
        </div>
      </div>
    </div>
  );
};
