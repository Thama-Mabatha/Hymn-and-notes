import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  css: {
    postcss: {
      plugins: []
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Nyimbo dza Vhatendi',
        short_name: 'Nyimbo',
        description: 'An offline-first digital Tshivenḓa hymnal and personal sermon archive.',
        theme_color: '#176b5b',
        background_color: '#fffdf8',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' }
        ]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,json,svg,png,ico}'] }
    })
  ]
});
