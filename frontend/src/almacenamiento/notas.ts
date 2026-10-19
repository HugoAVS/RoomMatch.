/* ============================================================================
   Notas privadas: operaciones sobre IndexedDB.

   Este módulo NO sabe nada de cifrado ni de contraseñas: guarda y busca
   registros. Qué campo viaja cifrado lo decide boveda.ts. Esa separación es la
   que permite buscar por etiqueta o por match sin descifrar nada.

   Todas las funciones reciben la base de datos como primer parámetro, igual que
   en la guía; así se pueden probar con una base de datos temporal.
   ========================================================================== */

import { ALMACEN_NOTAS, aPromesa, transaccionCompleta } from './bd';

export type Etiqueta = 'POSITIVO' | 'PENDIENTE' | 'ALERTA';

export const ETIQUETAS_NOTA: Record<Etiqueta, string> = {
  POSITIVO: '👍 Positivo',
  PENDIENTE: '⏳ Pendiente',
  ALERTA: '⚠️ Alerta',
};

export interface NotaGuardada {
  id?: number;
  // ---- en claro: tienen índice, por eso se pueden buscar ----
  matchId: string;
  etiqueta: Etiqueta;
  creadoEn: number;
  // ---- cifrado: ilegible sin la contraseña ----
  notaCifrada: ArrayBuffer;
  // ---- el IV no es secreto, pero es necesario para descifrar ----
  notaIv: Uint8Array;
}

/* ------------------------------------------------------------------ CRUD */

export async function agregarNota(db: IDBDatabase, nota: Omit<NotaGuardada, 'id'>): Promise<number> {
  const tx = db.transaction(ALMACEN_NOTAS, 'readwrite');
  const peticion = tx.objectStore(ALMACEN_NOTAS).add(nota);
  const [id] = await Promise.all([aPromesa(peticion), transaccionCompleta(tx)]);
  return id as number;
}

export function obtenerNota(db: IDBDatabase, id: number): Promise<NotaGuardada | undefined> {
  const tx = db.transaction(ALMACEN_NOTAS, 'readonly');
  return aPromesa(tx.objectStore(ALMACEN_NOTAS).get(id));
}

/** put inserta o actualiza: no falla si la clave ya existe (a diferencia de add). */
export async function actualizarNota(db: IDBDatabase, nota: NotaGuardada): Promise<void> {
  const tx = db.transaction(ALMACEN_NOTAS, 'readwrite');
  tx.objectStore(ALMACEN_NOTAS).put(nota);
  await transaccionCompleta(tx);
}

export async function eliminarNota(db: IDBDatabase, id: number): Promise<void> {
  const tx = db.transaction(ALMACEN_NOTAS, 'readwrite');
  tx.objectStore(ALMACEN_NOTAS).delete(id);
  await transaccionCompleta(tx);
}

export function listarNotas(db: IDBDatabase): Promise<NotaGuardada[]> {
  const tx = db.transaction(ALMACEN_NOTAS, 'readonly');
  return aPromesa(tx.objectStore(ALMACEN_NOTAS).getAll());
}

/** count() cuenta sin traer los registros a memoria. */
export function contarNotas(db: IDBDatabase): Promise<number> {
  const tx = db.transaction(ALMACEN_NOTAS, 'readonly');
  return aPromesa(tx.objectStore(ALMACEN_NOTAS).count());
}

/* ------------------------------------------------- consultas con índices */

/** Cuántas notas hay de una etiqueta: se responde SOLO con el índice, sin descifrar. */
export function contarPorEtiqueta(db: IDBDatabase, etiqueta: Etiqueta): Promise<number> {
  const tx = db.transaction(ALMACEN_NOTAS, 'readonly');
  return aPromesa(tx.objectStore(ALMACEN_NOTAS).index('porEtiqueta').count(IDBKeyRange.only(etiqueta)));
}

/**
 * Las notas de un match, de la más nueva a la más antigua.
 * Recorre el índice `porMatch` con un cursor: solo visita las notas que
 * coinciden, no el almacén entero.
 */
export function notasDeMatch(db: IDBDatabase, matchId: string): Promise<NotaGuardada[]> {
  return new Promise((resolver, rechazar) => {
    const resultado: NotaGuardada[] = [];
    const indice = db.transaction(ALMACEN_NOTAS, 'readonly').objectStore(ALMACEN_NOTAS).index('porMatch');
    const cursor = indice.openCursor(IDBKeyRange.only(matchId));

    cursor.onsuccess = () => {
      const c = cursor.result;
      if (c) {
        resultado.push(c.value);
        c.continue(); // sin esto el recorrido se detiene en el primer resultado
      } else {
        resultado.sort((a, b) => b.creadoEn - a.creadoEn);
        resolver(resultado);
      }
    };
    cursor.onerror = () => rechazar(cursor.error);
  });
}

/**
 * Cuántas notas tiene cada match, como { matchId: cantidad }.
 * Usa un cursor de CLAVES (openKeyCursor): lee solo la clave del índice y nunca
 * carga el contenido cifrado de las notas.
 */
export function contarNotasPorMatch(db: IDBDatabase): Promise<Record<string, number>> {
  return new Promise((resolver, rechazar) => {
    const cuentas: Record<string, number> = {};
    const indice = db.transaction(ALMACEN_NOTAS, 'readonly').objectStore(ALMACEN_NOTAS).index('porMatch');
    const cursor = indice.openKeyCursor();

    cursor.onsuccess = () => {
      const c = cursor.result;
      if (c) {
        const matchId = String(c.key);
        cuentas[matchId] = (cuentas[matchId] ?? 0) + 1;
        c.continue();
      } else {
        resolver(cuentas);
      }
    };
    cursor.onerror = () => rechazar(cursor.error);
  });
}

/**
 * Borra todas las notas de un match con un cursor en modo escritura.
 * cursor.delete() actúa sobre el registro en el que está parado el cursor, sin
 * necesitar su clave por separado. Devuelve cuántas borró.
 */
export async function eliminarNotasDeMatch(db: IDBDatabase, matchId: string): Promise<number> {
  const tx = db.transaction(ALMACEN_NOTAS, 'readwrite');
  const cursor = tx.objectStore(ALMACEN_NOTAS).index('porMatch').openCursor(IDBKeyRange.only(matchId));
  let borradas = 0;

  cursor.onsuccess = () => {
    const c = cursor.result;
    if (!c) return;
    c.delete();
    borradas++;
    c.continue();
  };

  await transaccionCompleta(tx);
  return borradas;
}

/** Vacía el almacén de notas (se usa al restablecer la bóveda). */
export async function eliminarTodasLasNotas(db: IDBDatabase): Promise<void> {
  const tx = db.transaction(ALMACEN_NOTAS, 'readwrite');
  tx.objectStore(ALMACEN_NOTAS).clear();
  await transaccionCompleta(tx);
}
