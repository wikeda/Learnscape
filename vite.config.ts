import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/Learnscape/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      // 初期搭載コンテンツ(日本史/世界史 計3600問)を同梱するためJSバンドルが約2.6MBになる。
      // オフライン利用のためこれをプリキャッシュ対象に含める（既定2MiBを引き上げ）。
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        name: 'Learnscape',
        short_name: 'Learnscape',
        start_url: '.',
        display: 'standalone',
        background_color: '#f4f6fa',
        theme_color: '#14b8a6',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
});
