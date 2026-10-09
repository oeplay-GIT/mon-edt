import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Domaines autorisés pour le proxy ICS en mode dev (Vercel utilise api/ics.ts)
const ALLOWED_SUFFIXES = ['.grenet.fr']

// Infos de version injectées à la build
const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
const APP_VERSION = env['npm_package_version'] ?? 'dev'
const APP_COMMIT = (env['VERCEL_GIT_COMMIT_SHA'] ?? '').slice(0, 7)
const BUILD_TIME = new Date().toISOString()

function icsDevProxy(): Plugin {
  return {
    name: 'ics-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/ics', async (req, res) => {
        try {
          const requestUrl = new URL(req.url ?? '', 'http://localhost')
          const target = requestUrl.searchParams.get('url')
          if (!target) {
            res.statusCode = 400
            res.end('Parametre url manquant')
            return
          }
          const parsed = new URL(target)
          const host = parsed.hostname.toLowerCase()
          const allowed =
            parsed.protocol === 'https:' &&
            ALLOWED_SUFFIXES.some((s) => host === s.slice(1) || host.endsWith(s))
          if (!allowed) {
            res.statusCode = 403
            res.end('Domaine non autorise')
            return
          }
          const upstream = await fetch(parsed.toString())
          const text = await upstream.text()
          res.statusCode = upstream.status
          res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
          res.end(text)
        } catch {
          res.statusCode = 502
          res.end('Erreur proxy')
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    icsDevProxy(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Mon EDT',
        short_name: 'Mon EDT',
        description: 'Mon emploi du temps universitaire',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f5f5f7',
        theme_color: '#f5f5f7',
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
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __APP_COMMIT__: JSON.stringify(APP_COMMIT),
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
})
