/* ============================================================================
   Registro del Service Worker (generado por Workbox) y aviso de versión nueva.

   Ya no se escribe navigator.serviceWorker.register('/sw.js') a mano: el plugin
   vite-plugin-pwa expone el módulo virtual "virtual:pwa-register", que registra
   el Service Worker y detecta cuándo hay uno nuevo esperando.
   ========================================================================== */

import { registerSW } from 'virtual:pwa-register';

type AlHaberActualizacion = (aplicar: () => void) => void;

// React en modo estricto ejecuta los efectos dos veces en desarrollo: sin esta
// marca se registraría (y escucharía) dos veces.
let yaIniciado = false;

/**
 * Antes de Workbox, un Service Worker escrito a mano guardaba sus archivos en
 * cachés llamadas "roommatch-shell-v2" y "roommatch-api-v2". Workbox solo borra
 * las que él mismo creó, así que esas quedarían huérfanas ocupando espacio en el
 * dispositivo de quien ya tenía la app instalada.
 */
async function limpiarCachesDelServiceWorkerManual(): Promise<void> {
  if (!('caches' in window)) return;
  const nombres = await caches.keys();
  await Promise.all(nombres.filter((n) => n.startsWith('roommatch-')).map((n) => caches.delete(n)));
}

export function registrarServiceWorker(alHaberActualizacion?: AlHaberActualizacion): void {
  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Este navegador no soporta Service Workers.');
    return;
  }
  if (yaIniciado) return;
  yaIniciado = true;

  // En desarrollo no hay Service Worker: Vite sirve /src/main.tsx y /@vite/client
  // al vuelo, y esos no son archivos reales que se puedan precachear. El
  // Service Worker lo genera Workbox dentro de dist/ al compilar, así que para
  // verlo hay que usar `npm run build` + `npm run preview`.
  //
  // Además se desregistra cualquiera que haya quedado de antes: un Service
  // Worker viejo "zombi" seguiría respondiendo desde su caché y escondería los
  // cambios que haces mientras programas.
  if (!import.meta.env.PROD) {
    navigator.serviceWorker.getRegistrations().then((registros) => {
      registros.forEach((registro) => registro.unregister());
    });
    console.info('[PWA] Desarrollo: sin Service Worker. Usa `npm run build` + `npm run preview`.');
    return;
  }

  const actualizar = registerSW({
    immediate: true,

    // Hay una versión nueva descargada y esperando. Se avisa al usuario; solo
    // cuando acepte se activa y se recarga la página.
    onNeedRefresh() {
      console.info('[PWA] Hay una versión nueva esperando.');
      alHaberActualizacion?.(() => actualizar(true));
    },

    // Workbox terminó de precachear: a partir de aquí la app abre sin red.
    onOfflineReady() {
      console.info('[PWA] Listo: la aplicación ya funciona sin conexión.');
    },

    onRegisteredSW(urlSW, registro) {
      console.info('[PWA] Service Worker de Workbox registrado:', urlSW, '· scope:', registro?.scope);
      limpiarCachesDelServiceWorkerManual().catch(() => undefined);
    },

    onRegisterError(error) {
      console.error('[PWA] No se pudo registrar el Service Worker:', error);
    },
  });
}
