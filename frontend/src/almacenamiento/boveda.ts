/* ============================================================================
   La bóveda de notas privadas.

   Une las tres piezas:
     · bd.ts      → dónde se guarda
     · cripto.ts  → cómo se cifra
     · notas.ts   → cómo se busca

   Reglas del diseño:
     1. La contraseña NUNCA se guarda. Solo se usa, en el momento, para derivar
        la clave (el mismo principio que un gestor de contraseñas).
     2. La clave derivada vive únicamente en memoria y no es exportable. Al
        recargar la página o pulsar "Bloquear" desaparece, y hay que volver a
        escribir la contraseña.
     3. Lo que se guarda en IndexedDB es: la sal, el número de iteraciones y un
        "verificador" cifrado. Con eso se puede REPRODUCIR la clave si se conoce
        la contraseña, y comprobar que es la correcta, sin guardar ningún secreto.
     4. Las notas nunca salen del dispositivo: no se envían al backend.
   ========================================================================== */

import { ALMACEN_CONFIG, obtenerBd, aPromesa, transaccionCompleta } from './bd';
import {
  ITERACIONES_PBKDF2,
  cifrarTexto,
  derivarClave,
  descifrarTexto,
  generarSal,
  type Cifrado,
} from './cripto';
import {
  agregarNota,
  eliminarTodasLasNotas,
  type Etiqueta,
  type NotaGuardada,
} from './notas';

/** Texto conocido que se cifra al crear la bóveda para poder validar la contraseña. */
const FRASE_VERIFICADORA = 'roommatch-boveda-v1';
const CLAVE_CONFIG = 'boveda';
export const LARGO_MINIMO_CONTRASENA = 8;

interface ConfigBoveda {
  clave: typeof CLAVE_CONFIG;
  sal: Uint8Array;
  iteraciones: number;
  verificador: Cifrado;
  creadaEn: number;
}

export class ContrasenaIncorrectaError extends Error {
  constructor() {
    super('Contraseña incorrecta');
    this.name = 'ContrasenaIncorrectaError';
  }
}

/* ------------------------------------------------- estado en memoria */

let claveEnMemoria: CryptoKey | null = null;
const oyentes = new Set<() => void>();

function avisar(): void {
  oyentes.forEach((oyente) => oyente());
}

/** Para useSyncExternalStore: permite que React se entere de bloqueos y desbloqueos. */
export function suscribirBoveda(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

export function estaDesbloqueada(): boolean {
  return claveEnMemoria !== null;
}

export function bloquear(): void {
  claveEnMemoria = null;
  avisar();
}

/* ------------------------------------------------- acceso a la base de datos */

// La conexión compartida vive en bd.ts; se reexporta para no cambiar los imports
// de quienes ya la usan desde aquí.
export { obtenerBd };

async function leerConfig(): Promise<ConfigBoveda | undefined> {
  const db = await obtenerBd();
  const tx = db.transaction(ALMACEN_CONFIG, 'readonly');
  return aPromesa(tx.objectStore(ALMACEN_CONFIG).get(CLAVE_CONFIG));
}

/* ------------------------------------------------- ciclo de vida de la bóveda */

export async function existeBoveda(): Promise<boolean> {
  return (await leerConfig()) !== undefined;
}

/** Primera vez: el usuario elige una contraseña y queda desbloqueada. */
export async function crearBoveda(contrasena: string): Promise<void> {
  if (contrasena.length < LARGO_MINIMO_CONTRASENA) {
    throw new Error(`La contraseña debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres`);
  }
  if (await existeBoveda()) throw new Error('La bóveda ya existe');

  const sal = generarSal();
  const clave = await derivarClave(contrasena, sal, ITERACIONES_PBKDF2);
  const verificador = await cifrarTexto(clave, FRASE_VERIFICADORA);

  const config: ConfigBoveda = {
    clave: CLAVE_CONFIG,
    sal,
    iteraciones: ITERACIONES_PBKDF2,
    verificador,
    creadaEn: Date.now(),
  };

  const db = await obtenerBd();
  const tx = db.transaction(ALMACEN_CONFIG, 'readwrite');
  tx.objectStore(ALMACEN_CONFIG).put(config);
  await transaccionCompleta(tx);

  claveEnMemoria = clave;
  avisar();
}

/**
 * Reproduce la clave con la contraseña y la sal guardada. Si la contraseña es
 * incorrecta, AES-GCM rechaza el verificador y se lanza ContrasenaIncorrectaError.
 */
export async function desbloquear(contrasena: string): Promise<void> {
  const config = await leerConfig();
  if (!config) throw new Error('La bóveda todavía no existe');

  const clave = await derivarClave(contrasena, config.sal, config.iteraciones);

  try {
    const texto = await descifrarTexto(clave, config.verificador);
    if (texto !== FRASE_VERIFICADORA) throw new ContrasenaIncorrectaError();
  } catch {
    throw new ContrasenaIncorrectaError();
  }

  claveEnMemoria = clave;
  avisar();
}

/** Para quien olvidó la contraseña: no hay recuperación posible, solo empezar de cero. */
export async function restablecerBoveda(): Promise<void> {
  const db = await obtenerBd();
  await eliminarTodasLasNotas(db);

  const tx = db.transaction(ALMACEN_CONFIG, 'readwrite');
  tx.objectStore(ALMACEN_CONFIG).delete(CLAVE_CONFIG);
  await transaccionCompleta(tx);

  bloquear();
}

/* ------------------------------------------------- notas cifradas */

function exigirClave(): CryptoKey {
  if (!claveEnMemoria) throw new Error('La bóveda está bloqueada');
  return claveEnMemoria;
}

/** Cifra el texto y guarda la nota. Etiqueta y match quedan en claro, indexados. */
export async function guardarNota(matchId: string, etiqueta: Etiqueta, texto: string): Promise<number> {
  const clave = exigirClave();
  const { cifrado, iv } = await cifrarTexto(clave, texto);

  const db = await obtenerBd();
  return agregarNota(db, {
    matchId,
    etiqueta,
    creadoEn: Date.now(),
    notaCifrada: cifrado,
    notaIv: iv,
  });
}

/** Descifra una nota. Solo se llama cuando el usuario la abre, de a una. */
export function leerNota(nota: NotaGuardada): Promise<string> {
  return descifrarTexto(exigirClave(), { cifrado: nota.notaCifrada, iv: nota.notaIv });
}
