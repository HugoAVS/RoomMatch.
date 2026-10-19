/* ============================================================================
   Cola de swipes pendientes (IndexedDB).

   Cuando el usuario acepta o descarta a alguien sin conexión, la decisión no
   se puede perder. Se guarda aquí y se reenvía cuando vuelva el internet.

   ¿Por qué IndexedDB y no un estado de React o localStorage?
     · El estado de React muere al cerrar la pestaña.
     · localStorage es síncrono y el Service Worker no puede leerlo.
     · IndexedDB sí es accesible desde el Service Worker, que es quien
       reenvía la cola con Background Sync aunque la app esté cerrada.
   ========================================================================== */

import type { Decision } from '../tipos';

const BD = 'roommatch';
const ALMACEN = 'swipes-pendientes';
const VERSION = 1;

export interface SwipePendiente {
  id?: number;
  autorId: string;
  objetivoId: string;
  decision: Decision;
  creadoEn: number;
}

function abrirBd(): Promise<IDBDatabase> {
  return new Promise((resolver, rechazar) => {
    const solicitud = indexedDB.open(BD, VERSION);

    solicitud.onupgradeneeded = () => {
      const bd = solicitud.result;
      if (!bd.objectStoreNames.contains(ALMACEN)) {
        bd.createObjectStore(ALMACEN, { keyPath: 'id', autoIncrement: true });
      }
    };

    solicitud.onsuccess = () => resolver(solicitud.result);
    solicitud.onerror = () => rechazar(solicitud.error);
  });
}

export async function encolarSwipe(swipe: Omit<SwipePendiente, 'id' | 'creadoEn'>): Promise<void> {
  const bd = await abrirBd();
  await new Promise<void>((resolver, rechazar) => {
    const tx = bd.transaction(ALMACEN, 'readwrite');
    tx.objectStore(ALMACEN).add({ ...swipe, creadoEn: Date.now() });
    tx.oncomplete = () => resolver();
    tx.onerror = () => rechazar(tx.error);
  });
  bd.close();
}

export async function contarPendientes(): Promise<number> {
  const bd = await abrirBd();
  const total = await new Promise<number>((resolver, rechazar) => {
    const solicitud = bd.transaction(ALMACEN, 'readonly').objectStore(ALMACEN).count();
    solicitud.onsuccess = () => resolver(solicitud.result);
    solicitud.onerror = () => rechazar(solicitud.error);
  });
  bd.close();
  return total;
}

/**
 * Pide al Service Worker que reenvíe la cola.
 *
 * Background Sync (`sync`) es lo ideal: el navegador espera a que haya
 * conexión estable y lo reintenta solo, incluso con la app cerrada. Pero
 * Safari y Firefox todavía no lo soportan, así que si no está disponible se
 * le avisa al Service Worker por mensaje y se sincroniza de una vez.
 */
export async function solicitarSincronizacion(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registro = await navigator.serviceWorker.ready;

  if ('sync' in registro) {
    try {
      await (registro as ServiceWorkerRegistration & {
        sync: { register: (etiqueta: string) => Promise<void> };
      }).sync.register('sincronizar-swipes');
      return;
    } catch {
      // Si falla el registro, caemos al mensaje directo de abajo.
    }
  }

  registro.active?.postMessage({ tipo: 'SINCRONIZAR_SWIPES' });
}
