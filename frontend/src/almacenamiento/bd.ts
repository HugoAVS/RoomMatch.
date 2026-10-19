/* ============================================================================
   Base de datos de las notas privadas (IndexedDB) y su versionado.

   ¿Por qué una base de datos aparte de la cola de swipes ('roommatch')?
   El Service Worker abre esa otra base con una versión fija. Si aquí se subiera
   su versión, el Service Worker fallaría con VersionError al intentar abrirla.
   Cada base de datos evoluciona a su ritmo sin romper a la otra.
   ========================================================================== */

export const NOMBRE_BD = 'roommatch-notas';
export const VERSION_BD = 3;

export const ALMACEN_NOTAS = 'notas';
export const ALMACEN_CONFIG = 'config';
export const ALMACEN_FOTO = 'foto';

/**
 * Una migración por versión: MIGRACIONES[0] lleva de la v0 (no existe) a la v1,
 * MIGRACIONES[1] de la v1 a la v2, y así sucesivamente.
 *
 * Es el mismo patrón `if (version < N)` de la guía, escrito como lista para
 * poder abrir la base en cualquier versión intermedia (lo usan las pruebas).
 * Recibe la transacción de actualización: es la ÚNICA donde se pueden crear
 * stores e índices, y debe ser síncrona (sin `await`), o la transacción se cierra.
 */
const MIGRACIONES: Array<(db: IDBDatabase, tx: IDBTransaction) => void> = [
  // v0 -> v1: nace el almacén de notas
  (db) => {
    const notas = db.createObjectStore(ALMACEN_NOTAS, { keyPath: 'id', autoIncrement: true });
    notas.createIndex('porMatch', 'matchId', { unique: false });
    notas.createIndex('porEtiqueta', 'etiqueta', { unique: false });
  },

  // v1 -> v2: índice por fecha + almacén de configuración (sal de la clave)
  (db, tx) => {
    const notas = tx.objectStore(ALMACEN_NOTAS);
    notas.createIndex('porFecha', 'creadoEn', { unique: false });

    // Las notas de la v1 no tenían fecha, y un registro sin la propiedad
    // indexada queda fuera del índice. Se rellena recorriendo con un cursor,
    // que es justo para lo que sirve cursor.update().
    const recorrido = notas.openCursor();
    recorrido.onsuccess = () => {
      const cursor = recorrido.result;
      if (!cursor) return;
      if (typeof cursor.value.creadoEn !== 'number') {
        cursor.update({ ...cursor.value, creadoEn: Date.now() });
      }
      cursor.continue();
    };

    db.createObjectStore(ALMACEN_CONFIG, { keyPath: 'clave' });
  },

  // v2 -> v3: almacén de la foto de perfil. Es un almacén NUEVO, así que los
  // usuarios que ya tenían la v2 conservan sus notas y su bóveda intactas.
  (db) => {
    db.createObjectStore(ALMACEN_FOTO, { keyPath: 'clave' });
  },
];

/**
 * Abre la base de datos, migrándola si hace falta.
 * `version` solo se cambia en pruebas, para simular un usuario con la v1.
 */
export function abrirBd(nombre = NOMBRE_BD, version = VERSION_BD): Promise<IDBDatabase> {
  return new Promise((resolver, rechazar) => {
    const peticion = indexedDB.open(nombre, version);

    peticion.onupgradeneeded = (evento) => {
      const db = peticion.result;
      const tx = peticion.transaction!;

      // oldVersion es 0 para un usuario nuevo, o la versión que ya tenía.
      // Se ejecutan solo las migraciones que le faltan, sin tocar sus datos.
      for (let v = evento.oldVersion; v < (evento.newVersion ?? version); v++) {
        MIGRACIONES[v](db, tx);
      }
    };

    peticion.onsuccess = () => {
      const db = peticion.result;
      // Si otra pestaña pide subir la versión, esta conexión se cierra para no
      // bloquearla indefinidamente.
      db.onversionchange = () => db.close();
      resolver(db);
    };

    peticion.onerror = () => rechazar(peticion.error);
    peticion.onblocked = () =>
      rechazar(new Error('Hay otra pestaña con la base de datos abierta. Ciérrala e inténtalo de nuevo.'));
  });
}

let conexion: Promise<IDBDatabase> | null = null;

/**
 * Una sola conexión compartida por toda la app. Si falla al abrir, se descarta
 * para poder reintentar; y si otra pestaña sube la versión (abrirBd cierra esta
 * conexión), también se descarta, para que la siguiente llamada abra una nueva
 * en vez de recibir una conexión ya cerrada.
 */
export function obtenerBd(): Promise<IDBDatabase> {
  if (!conexion) {
    conexion = abrirBd()
      .then((db) => {
        db.addEventListener('versionchange', () => {
          conexion = null;
        });
        return db;
      })
      .catch((error) => {
        conexion = null;
        throw error;
      });
  }
  return conexion;
}

/** Convierte un IDBRequest (basado en eventos) en una promesa, para usar await. */
export function aPromesa<T>(peticion: IDBRequest<T>): Promise<T> {
  return new Promise((resolver, rechazar) => {
    peticion.onsuccess = () => resolver(peticion.result);
    peticion.onerror = () => rechazar(peticion.error);
  });
}

/**
 * Resuelve cuando la transacción TERMINÓ de guardar en disco (oncomplete), no
 * cuando la petición individual tuvo éxito: el éxito de una petición no
 * garantiza que la transacción no se aborte después.
 */
export function transaccionCompleta(tx: IDBTransaction): Promise<void> {
  return new Promise((resolver, rechazar) => {
    tx.oncomplete = () => resolver();
    tx.onerror = () => rechazar(tx.error);
    tx.onabort = () => rechazar(tx.error ?? new Error('Transacción cancelada'));
  });
}
