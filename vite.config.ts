import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { CONFIG } from './src/config';

// Relative base: works on GitHub Pages under /stall-tokens/ and locally (direct replace, D-HOST dropped).
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // calm update: the app shows "Update ready" and never reloads mid-order
      injectRegister: false,
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Stall Tokens', short_name: 'Stall', start_url: './', scope: './', display: 'standalone',
        background_color: '#0b1020', theme_color: '#0b1020',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,woff2}'], navigateFallback: 'index.html' },
    }),
  ],
  server: { port: CONFIG.ports.dev, strictPort: true },
  preview: { port: CONFIG.ports.preview, strictPort: true },
  css: { modules: { localsConvention: 'camelCaseOnly' } },
  test: { environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'] },
});
