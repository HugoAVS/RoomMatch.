import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * El frontend llama siempre a rutas relativas (/api/...) y Vite las reenvía al
 * backend. Dos ventajas importantes:
 *
 *  1. No hay CORS: para el navegador, la API vive en el mismo origen que la app.
 *  2. El Service Worker puede cachear las respuestas de la API con las mismas
 *     reglas que el resto, sin los límites que tienen las peticiones a otro
 *     origen desde dentro de un Service Worker.
 *
 * En producción esto lo haría un servidor web (Nginx) o la plataforma de
 * despliegue; aquí lo hace Vite tanto en `dev` como en `preview`.
 */
const proxy = {
  '/api': {
    target: 'http://localhost:4000',
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      // El manifest ya existe a mano en public/manifest.json: aquí solo se le
      // pide a Workbox que genere el Service Worker, no el manifest.
      manifest: false,

      // 'prompt': la versión nueva queda esperando y la app muestra el banner
      // "Hay una versión nueva", para que nadie pierda lo que está haciendo por
      // una recarga sorpresa. ('autoUpdate' actualizaría sola, sin avisar.)
      registerType: 'prompt',

      // El registro lo hacemos nosotros (src/pwa/registrarServiceWorker.ts).
      injectRegister: false,

      workbox: {
        // La lista de precaché se genera a partir de dist/ DESPUÉS del build,
        // con los nombres reales de archivo (con el hash de Vite incluido). Nunca
        // se escribe a mano, así que nunca queda desactualizada.
        globPatterns: ['**/*.{html,js,css,png,svg,json}'],

        // La primera vez, el Service Worker toma el control de la página abierta
        // sin esperar a una recarga: así las peticiones de esa primera sesión ya
        // quedan en caché. (En 'prompt' no viene activado por defecto.)
        clientsClaim: true,

        // Una navegación a /api/... nunca debe responderse con el index.html.
        navigateFallbackDenylist: [/^\/api\//],

        // Workbox con GenerateSW no genera por sí solo el Background Sync de los
        // swipes pendientes, así que ese código vive en public/sync-swipes.js y
        // se incluye dentro del Service Worker generado.
        importScripts: ['sync-swipes.js'],

        runtimeCaching: [
          {
            // Cache First: los íconos no cambian con el mismo nombre.
            urlPattern: /\/icons\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'imagenes',
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            // Network First: con internet, datos frescos; sin internet, los últimos
            // guardados. Solo aplica a GET: los POST (los swipes) nunca se cachean.
            urlPattern: /\/api\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-roommatch' },
          },
        ],
      },
    }),
  ],
  server: { port: 5174, proxy },
  preview: { port: 4174, proxy },
});
