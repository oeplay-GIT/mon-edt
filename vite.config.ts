import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Domaines autorisés pour le proxy.
 * ➜ Si ton université n'est pas sur grenet.fr, modifie cette liste
 *   (ici ET dans api/ics.ts).
 */
const ALLOWED_SUFFIXES = ['.grenet.fr'];

/** Proxy utilisé uniquement avec `npm run dev` (contourne le blocage CORS). */
function icsDevProxy(): Plugin {
  return {
    name: 'ics-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/ics', async (req, res) => {
        const send = (code: number, body: string) => {
          res.statusCode = code;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(body);
        };
        try {
          const target = new URL(req.url ?? '', 'http://localhost').searchParams.get('url');
          if (!target) return send(400, 'Paramètre "url" manquant.');
          const u = new URL(target);
          const allowed =
            u.protocol === 'https:' && ALLOWED_SUFFIXES.some((s) => u.hostname.endsWith(s));
          if (!allowed) return send(403, 'Domaine non autorisé.');
          const upstream = await fetch(u);
          send(upstream.status, await upstream.text());
        } catch {
          send(502, 'Erreur du proxy.');
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    icsDevProxy(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Mon EDT',
        short_name: 'EDT',
        description: 'Mon emploi du temps étudiant',
        lang: 'fr',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        background_color: '#f5f5f7',
        theme_color: '#f5f5f7',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Ne jamais mettre l'API en cache ni la rediriger vers index.html
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
});
