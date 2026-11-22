import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Native shell configuration. The game itself is the exact static build in `dist/`, so browser and
 * Android share gameplay, content and save-data rules.
 */
const config: CapacitorConfig = {
  appId: 'com.ayirus.hoshinohanabira',
  appName: 'Hoshi no Hanabira',
  webDir: 'dist',
  backgroundColor: '#07060f',
  android: {
    backgroundColor: '#07060f',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
