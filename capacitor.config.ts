import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.314fecde78d046e2b807bd23305da5ba',
  appName: 'HidroAlly',
  webDir: 'dist',
  // Remove server.url before building for production/release.
  // Un-comment ONLY for local dev with hot-reload:
  // server: {
  //   url: 'https://314fecde-78d0-46e2-b807-bd23305da5ba.lovableproject.com?forceHideBadge=true',
  //   cleartext: true,
  // },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#7C3AED',
      sound: 'default',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  android: {
    // Allow scheduling exact alarms (needed for precise reminder timing on Android 12+)
    // User must grant SCHEDULE_EXACT_ALARM permission from app settings on Android 13+
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;
