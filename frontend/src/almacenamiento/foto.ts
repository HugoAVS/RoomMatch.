/* ============================================================================
   Foto de perfil guardada en el dispositivo (IndexedDB).

   Se guarda como Blob (el archivo JPEG tal cual) y no como texto en base64:
   IndexedDB admite binarios, y el base64 pesa un tercio más. A diferencia de
   localStorage, que solo guarda texto, aquí no hay que convertir nada.

   La foto NO se envía al servidor: vive solo en este dispositivo.
   ========================================================================== */

import { ALMACEN_FOTO, aPromesa, obtenerBd, transaccionCompleta } from './bd';

const CLAVE = 'perfil';

export interface FotoGuardada {
  clave: typeof CLAVE;
  imagen: Blob;
  tomadaEn: number;
}

/** put: inserta o reemplaza. Solo hay una foto de perfil, así que siempre es la misma clave. */
export async function guardarFotoPerfil(imagen: Blob): Promise<void> {
  const db = await obtenerBd();
  const tx = db.transaction(ALMACEN_FOTO, 'readwrite');
  const registro: FotoGuardada = { clave: CLAVE, imagen, tomadaEn: Date.now() };
  tx.objectStore(ALMACEN_FOTO).put(registro);
  await transaccionCompleta(tx);
}

export async function leerFotoPerfil(): Promise<FotoGuardada | undefined> {
  const db = await obtenerBd();
  const tx = db.transaction(ALMACEN_FOTO, 'readonly');
  return aPromesa<FotoGuardada | undefined>(tx.objectStore(ALMACEN_FOTO).get(CLAVE));
}

export async function borrarFotoPerfil(): Promise<void> {
  const db = await obtenerBd();
  const tx = db.transaction(ALMACEN_FOTO, 'readwrite');
  tx.objectStore(ALMACEN_FOTO).delete(CLAVE);
  await transaccionCompleta(tx);
}
