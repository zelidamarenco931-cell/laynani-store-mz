import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.laynani.store',
  appName: 'Laynani',
  webDir: 'dist',
  server: {
    // O APK carrega sempre a versão publicada, por isso as alterações do site aparecem sem recompilar.
    url: 'https://laynani-store.vercel.app',
    cleartext: false
  }
};

export default config;