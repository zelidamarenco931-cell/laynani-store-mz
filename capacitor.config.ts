import type { CapacitorConfig } from '@capacitor/cli';

// A app carrega sempre o site publicado na Vercel, por isso as alterações
// do site aparecem na app sem ser preciso gerar um APK novo.
// (O APK só tem de ser gerado outra vez se mudar este ficheiro, o ícone ou plugins nativos.)
const config: CapacitorConfig = {
  appId: 'com.laynani.store',
  appName: 'Laynani',
  webDir: 'dist',
  server: {
    url: 'https://laynani-store.vercel.app',
    androidScheme: 'https',
    cleartext: false,
  },
};

export default config;
