import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Bell, Save, Info, CloudSun, Database, TestTube, RefreshCw, ExternalLink, ShieldAlert, Send } from 'lucide-react';
import { toast } from 'sonner';
import { notificationManager, isBackgroundNotificationsEnabled, setBackgroundNotificationsEnabled } from '@/services/NotificationManager';
import { audioAlertPlayer } from '@/utils/audioAlertPlayer';
import { SettingsPanel } from '@/components/climate/SettingsPanel';
import { WebPushSettings } from '@/components/climate/WebPushSettings';
import { webPushService } from '@/services/WebPushService';
import { useAuth } from '@/contexts/AuthContext';

const ANDROID_SETTINGS_INTENT = 'intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:guru.sweatsmart.twa;end';
import type { Thresholds } from '@/types';

const Settings = () => {
  const { user } = useAuth();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [bgNotifications, setBgNotifications] = useState(isBackgroundNotificationsEnabled());
  const [dataRetention, setDataRetention] = useState(30);
  const [alertFrequency, setAlertFrequency] = useState(6);
  const [thresholds, setThresholds] = useState<Thresholds>(() => {
    const saved = localStorage.getItem('sweatSmartThresholds');
    return saved ? JSON.parse(saved) : { temperature: 28, humidity: 70, uvIndex: 6 };
  });

  useEffect(() => {
    const saved = localStorage.getItem('climateAppSettings');
    if (saved) {
      const parsed = JSON.parse(saved);
      setAutoRefresh(parsed.autoRefresh ?? true);
      setSoundAlerts(parsed.soundAlerts ?? true);
      setDataRetention(parsed.dataRetention ?? 30);
      setAlertFrequency(parsed.alertFrequency ?? 6);
    }
  }, []);

  useEffect(() => {
    audioAlertPlayer.setSoundEnabled(soundAlerts);
  }, [soundAlerts]);

  const handleSaveSettings = () => {
    const settings = {
      autoRefresh,
      soundAlerts,
      dataRetention,
      alertFrequency
    };
    localStorage.setItem('climateAppSettings', JSON.stringify(settings));
    localStorage.setItem('sweatSmartThresholds', JSON.stringify(thresholds));
    audioAlertPlayer.setSoundEnabled(soundAlerts);
    toast.success('Settings saved successfully!');
  };

  const handleThresholdChange = (key: keyof Thresholds, value: number) => {
    setThresholds(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-black pb-24 text-zinc-100">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-black tracking-tight text-white">Settings</h1>
          <p className="text-sm text-zinc-400">Manage your clinical preferences</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Compulsory 6-hour App Alerts */}
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Bell className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white">App Alerts (Required)</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">A check‑in alert will be sent every 6 hours: "It's time for your six-hour check-in 💧".</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-green-500/10 text-green-400 px-3 py-1 text-xs font-bold">
                <span className="h-2 w-2 rounded-full bg-green-400" /> Active
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-zinc-500 italic">These alerts are always on. If prompted, please allow notifications so they can appear even when you're not on this page.</p>
        </Card>

        {/* Climate Alert Settings */}
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CloudSun className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">Climate Alerts</h2>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-bold text-zinc-200">Auto-Refresh Weather</div>
                <div className="text-sm text-zinc-400">
                  Automatically update weather data every 15 minutes
                </div>
              </div>
              <Switch
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-bold text-zinc-200">Sound Alerts</div>
                <div className="text-sm text-zinc-400">
                  Play a clinical sound when risk conditions are detected
                </div>
              </div>
              <Switch
                checked={soundAlerts}
                onCheckedChange={setSoundAlerts}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-bold text-zinc-200">Background Notifications</div>
                <div className="text-sm text-zinc-400">
                  Allow alerts to fire when the app is closed or in the background
                </div>
              </div>
              <Switch
                checked={bgNotifications}
                onCheckedChange={(v) => {
                  setBgNotifications(v);
                  setBackgroundNotificationsEnabled(v);
                }}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            <div className="border-t border-zinc-800 pt-6 mt-6">
              <SettingsPanel
                thresholds={thresholds}
                onThresholdChange={handleThresholdChange}
              />
            </div>

            <div className="border-t border-zinc-800 pt-6 mt-6">
              <WebPushSettings thresholds={thresholds} />
            </div>
          </div>
        </Card>

        {/* Data Management */}
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Database className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">Data Management</h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="flex justify-between text-sm font-bold mb-3 text-zinc-200">
                <span>Log Retention Period</span>
                <span className="text-primary">{dataRetention} days</span>
              </label>
              <input 
                type="range" 
                min="7" 
                max="90" 
                step="7"
                value={dataRetention} 
                onChange={(e) => setDataRetention(+e.target.value)} 
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-zinc-500 mt-2 font-medium uppercase">
                <span>7 days</span>
                <span>90 days</span>
              </div>
            </div>

            <div>
              <label className="flex justify-between text-sm font-bold mb-3 text-zinc-200">
                <span>Check Interval</span>
                <span className="text-primary">Every {alertFrequency} hours</span>
              </label>
              <input 
                type="range" 
                min="1" 
                max="12" 
                step="1"
                value={alertFrequency} 
                onChange={(e) => setAlertFrequency(+e.target.value)} 
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-zinc-500 mt-2 font-medium uppercase">
                <span>1 hour</span>
                <span>12 hours</span>
              </div>
              <p className="text-xs text-zinc-400 mt-2 italic">
                How often to check weather conditions and trigger alerts
              </p>
            </div>
          </div>
        </Card>

        {/* Privacy Notice */}
        <Card className="p-6 bg-blue-900/10 border-blue-900/30">
          <h3 className="font-bold mb-2 flex items-center gap-2 text-blue-400">
            <Info className="w-5 h-5" />
            Privacy Notice
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            All your data is stored locally on your device. We do not collect or transmit any personal information. 
            Your location is only used to fetch weather data and is never shared with third parties.
          </p>
        </Card>

        {/* Notification Repair & Android Settings */}
        <Card className="p-6 border-zinc-800 bg-zinc-900 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <ShieldAlert className="w-24 h-24 text-primary" />
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
              <RefreshCw className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">Notification Repair</h2>
          </div>

          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            If you are not receiving alerts when the app is closed, use these tools to re‑sync your device with the SweatSmart Clinical Engine.
          </p>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-zinc-800/50 border border-zinc-700/50">
              <h4 className="text-sm font-bold text-white mb-2">Android System Settings</h4>
              <p className="text-xs text-zinc-500 mb-4">
                Verify that notifications are enabled and not restricted by Android's battery optimizer.
              </p>
              <Button
                onClick={() => window.location.href = ANDROID_SETTINGS_INTENT}
                className="w-full bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-bold uppercase tracking-widest py-6 rounded-xl"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Android Settings
              </Button>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-800/50 border border-zinc-700/50">
              <h4 className="text-sm font-bold text-white mb-2">Force Re‑Sync</h4>
              <p className="text-xs text-zinc-500 mb-4">
                Clears and recreates your background notification keys. Use this if alerts stop completely.
              </p>
              <Button
                variant="outline"
                className="w-full border-primary/30 hover:bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest py-6 rounded-xl"
                onClick={async () => {
                  const id = toast.loading("Repairing connection...");
                  try {
                    const res = await webPushService.refreshSubscription(user?.id);
                    if (res) {
                      toast.success("Connection Repaired!", { id });
                    } else {
                      toast.error("Repair failed. Check internet connection.", { id });
                    }
                  } catch (e) {
                    toast.error("An error occurred during repair.", { id });
                  }
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Repair Background Sync
              </Button>
            </div>
          </div>
        </Card>

        {/* Test Notifications */}
        <Card className="p-6 border-zinc-800 bg-zinc-900 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-zinc-800 rounded-lg">
              <TestTube className="w-6 h-6 text-zinc-400" />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">Clinical Diagnostics</h2>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Button
              variant="secondary"
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold justify-between px-6 py-7 rounded-2xl"
              onClick={async () => {
                toast.info("Testing Voice Alert...");
                await notificationManager.send({
                  channel: 'system',
                  kind: 'reminder',
                  title: "⏰ Time for Your Six-Hour Check-In",
                  body: "It's time for your six-hour check-in 💧",
                  dedupKey: `test-rem-${Date.now()}`
                });
              }}
            >
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="text-sm font-black">Test Check-In Voice</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Foreground Test</div>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              </div>
            </Button>

            <Button
              variant="secondary"
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold justify-between px-6 py-7 rounded-2xl"
              onClick={async () => {
                const id = toast.loading("Sending background test...");
                try {
                  const res = await webPushService.sendTestNotification();
                  if (res.success) {
                    toast.success("Background alert sent! Close the app now to see it.", { id });
                  } else {
                    toast.error(`Background test failed: ${res.error}`, { id });
                  }
                } catch (e) {
                  toast.error("Background test failed.", { id });
                }
              }}
            >
              <div className="flex items-center gap-3">
                <Send className="w-5 h-5 text-green-400" />
                <div className="text-left">
                  <div className="text-sm font-black">Test Background Notification</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Closed-App Test</div>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              </div>
            </Button>
          </div>
        </Card>

        {/* App Information */}
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <h3 className="text-lg font-bold mb-4 text-white uppercase tracking-wider">About SweatSmart</h3>
          <div className="space-y-3 text-sm text-zinc-400">
            <p>
              <strong className="text-zinc-200">Version:</strong> 1.0.0
            </p>
            <p>
              <strong className="text-zinc-200">Purpose:</strong> Monitor real-time clinical conditions
              and provide personalized alerts for hyperhidrosis warriors.
            </p>
            <p>
              <strong className="text-zinc-200">Data Sources:</strong> OpenWeatherMap API,
              simulated EDA sensor readings
            </p>
          </div>
        </Card>
      </div>

      {/* Save Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-900 border-t border-zinc-800">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={handleSaveSettings}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest"
            size="lg"
          >
            <Save className="mr-2 h-5 w-5" />
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
