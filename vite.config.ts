import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Publicado em https://rgvduarte.github.io/Rasto/
// base relativa: o site funciona em qualquer caminho (e com qualquer capitalização do nome do repositório),
// porque as rotas são por hash (#/gravar) e os recursos são pedidos a partir da página.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    // App instalável e com mapa sem rede: o service worker guarda a app e, à medida que se usa (ou de uma vez, no Perfil),
    // as tiles, os glifos e os dados do concelho.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      manifest: {
        id: './',
        name: 'Rasto Serpa',
        short_name: 'Rasto',
        description: 'O concelho de Serpa como tabuleiro: mapa, lugares com classificação, missões e território para conquistar a andar.',
        lang: 'pt-PT',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        categories: ['travel', 'navigation', 'games', 'sports'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Gravar', short_name: 'Gravar', url: './#/gravar', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Missões', short_name: 'Missões', url: './#/missoes', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,svg}', 'icons/*.png'],
        globIgnores: ['tiles/**', 'glyphs/**', 'cartaz/**', 'data/**', 'assets/archivo-vietnamese*', 'assets/*schibsted*'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\/(tiles|glyphs)\//.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'rasto-tiles-v1', expiration: { maxEntries: 5000 }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            urlPattern: ({ url }) => /\/data\/.+\.json$/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'rasto-data-v1', cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
  worker: { format: 'es' },
  build: { chunkSizeWarningLimit: 1200 },
})
