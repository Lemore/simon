import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// GitHub Pages serves this project under /<repo>/ (ADR-7); build and preview use it, dev keeps the root path.
const PAGES_BASE = '/simon/'
const BG = '#0b1426'

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => {
  const base = command === 'build' || isPreview ? PAGES_BASE : '/'
  return {
    base,
    plugins: [
      react(),
      VitePWA({
        strategies: 'generateSW',
        // Never auto-update: a new version waits until the player agrees (ADR-8).
        registerType: 'prompt',
        injectRegister: false,
        // Icons are already in globPatterns; avoid duplicate precache entries.
        includeManifestIcons: false,
        manifest: {
          name: 'סיימון – משחק זיכרון',
          short_name: 'סיימון',
          description: 'משחק זיכרון של צבעים וצלילים',
          lang: 'he',
          dir: 'rtl',
          display: 'standalone',
          orientation: 'portrait',
          start_url: base,
          scope: base,
          theme_color: BG,
          background_color: BG,
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          // Covers every built and public file; woff2 only, which every SW-capable browser reads.
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
    },
  }
})
