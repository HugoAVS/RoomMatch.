/* ============================================================================
   Background Sync de los swipes pendientes.

   Este archivo lo incluye el Service Worker que genera Workbox (opción
   `importScripts` de vite.config.ts). Workbox se encarga del caché y de las
   actualizaciones; aquí queda solo lo que es propio de RoomMatch:

     · cuando el usuario decide sin conexión, la decisión se guarda en IndexedDB
       (src/pwa/colaSwipes.ts) y
     · al volver la red, ESTE código las reenvía al servidor, aunque la app esté
       cerrada (evento `sync`).

   Es JavaScript y no TypeScript porque vive en public/ y Vite no compila esa
   carpeta.
   ========================================================================== */

const BD = 'roommatch';
const ALMACEN = 'swipes-pendientes';
const URL_LOTE = '/api/swipes/lote';

function abrirBd() {
  return new Promise((resolver, rechazar) => {
    const solicitud = indexedDB.open(BD, 1);
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

function leerPendientes(bd) {
  return new Promise((resolver, rechazar) => {
    const solicitud = bd.transaction(ALMACEN, 'readonly').objectStore(ALMACEN).getAll();
    solicitud.onsuccess = () => resolver(solicitud.result);
    solicitud.onerror = () => rechazar(solicitud.error);
  });
}

// Borra SOLO los swipes que se enviaron. Un clear() borraría también los que el
// usuario haya hecho mientras el envío estaba en curso, sin haberlos enviado.
function eliminarEnviados(bd, ids) {
  return new Promise((resolver, rechazar) => {
    const tx = bd.transaction(ALMACEN, 'readwrite');
    ids.forEach((id) => tx.objectStore(ALMACEN).delete(id));
    tx.oncomplete = () => resolver();
    tx.onerror = () => rechazar(tx.error);
  });
}

async function sincronizarSwipes() {
  const bd = await abrirBd();
  const pendientes = await leerPendientes(bd);

  if (pendientes.length === 0) {
    bd.close();
    return;
  }

  console.log(`[SW] sincronizando ${pendientes.length} swipes pendientes`);

  const respuesta = await fetch(URL_LOTE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      swipes: pendientes.map(({ autorId, objetivoId, decision }) => ({
        autorId,
        objetivoId,
        decision,
      })),
    }),
  });

  // Si falla, NO se borra la cola: Background Sync volverá a intentarlo solo.
  if (!respuesta.ok) {
    bd.close();
    throw new Error('El servidor rechazó el lote de swipes');
  }

  const resultado = await respuesta.json();
  await eliminarEnviados(bd, pendientes.map((p) => p.id));
  bd.close();

  // Se avisa a las pestañas abiertas para que refresquen matches y contadores.
  const clientes = await self.clients.matchAll({ type: 'window' });
  clientes.forEach((cliente) =>
    cliente.postMessage({ tipo: 'SWIPES_SINCRONIZADOS', total: resultado.procesados }),
  );
}

// Lo dispara el navegador cuando vuelve la red (Chrome y Edge).
self.addEventListener('sync', (evento) => {
  if (evento.tag === 'sincronizar-swipes') {
    evento.waitUntil(sincronizarSwipes());
  }
});

// Respaldo para navegadores sin Background Sync (Safari, Firefox): la app le
// pide al Service Worker que sincronice de inmediato.
self.addEventListener('message', (evento) => {
  if (evento.data?.tipo === 'SINCRONIZAR_SWIPES') {
    evento.waitUntil(sincronizarSwipes());
  }
});
