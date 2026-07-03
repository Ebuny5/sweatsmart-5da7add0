import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.314fecde78d046e2b807bd23305da5ba',
  appName: 'sweatsmart',
  webDir: 'dist',
  server: {
    url: 'https://314fecde-78d0-46e2-b807-bd23305da5ba.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#3A7BD5',
      sound: 'beep.wav',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
