import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ru.urtisi.pary',
  appName: 'Пары',
  webDir: 'dist',
  android: {
    backgroundColor: '#0f1115',
    adjustMarginsForEdgeToEdge: 'auto',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
