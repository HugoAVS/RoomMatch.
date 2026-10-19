/* ============================================================================
   Criptografía con la Web Crypto API (crypto.subtle).

   Solo funciona en un contexto seguro: HTTPS o localhost. Abierta por la IP de
   la red local (http://192.168.x.x), crypto.subtle no existe.
   Todas las operaciones devuelven promesas, a diferencia de IndexedDB.
   ========================================================================== */

/**
 * Iteraciones de PBKDF2-SHA256. La guía usa 100 000 y avisa de que ese mínimo
 * sube con el tiempo; la recomendación actual de OWASP para PBKDF2-HMAC-SHA256
 * es 600 000. Se guarda junto a la sal, así que subir este número en el futuro
 * no deja inservibles las bóvedas ya creadas con el valor anterior.
 */
export const ITERACIONES_PBKDF2 = 600_000;

export interface Cifrado {
  cifrado: ArrayBuffer;
  iv: Uint8Array;
}

export function criptoDisponible(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle;
}

/** SHA-256 en hexadecimal: una huella para comprobar que un dato no cambió. */
export async function calcularHash(datos: string | ArrayBuffer): Promise<string> {
  const bytes = typeof datos === 'string' ? new TextEncoder().encode(datos) : datos;
  const buffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * La sal no es secreta, pero sí tiene que ser aleatoria y guardarse junto a los
 * datos: sin ella ni la contraseña correcta reproduce la misma clave.
 */
export function generarSal(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Deriva una clave AES-256 a partir de una contraseña con PBKDF2.
 *
 * La clave resultante NO es exportable (`extractable: false`): no se puede leer
 * ni guardar, solo volver a derivar con la misma contraseña y la misma sal. Así,
 * aunque alguien inspeccione la memoria o el almacenamiento, no encuentra una
 * clave lista para usar.
 */
export async function derivarClave(
  contrasena: string,
  sal: Uint8Array,
  iteraciones = ITERACIONES_PBKDF2,
): Promise<CryptoKey> {
  // 1. La contraseña entra como material crudo: todavía no es una CryptoKey utilizable.
  const materialBase = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(contrasena),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  // 2. PBKDF2 mezcla contraseña y sal `iteraciones` veces. Es lento a propósito:
  //    cada intento de fuerza bruta también tiene que pagar ese costo.
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: sal as BufferSource, iterations: iteraciones, hash: 'SHA-256' },
    materialBase,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Cifra con AES-GCM. Cada cifrado lleva un IV (vector de inicialización) nuevo
 * y aleatorio: reutilizar el IV con la misma clave rompe las garantías de
 * AES-GCM. El IV no es secreto, se guarda en claro junto al dato cifrado.
 */
export async function cifrarTexto(clave: CryptoKey, texto: string): Promise<Cifrado> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cifrado = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    clave,
    new TextEncoder().encode(texto),
  );
  return { cifrado, iv };
}

/**
 * Descifra. Si la clave o el IV son incorrectos, o si el dato cifrado fue
 * alterado, AES-GCM RECHAZA la promesa (OperationError) en vez de devolver
 * basura: así detecta tanto la contraseña equivocada como la manipulación.
 */
export async function descifrarTexto(clave: CryptoKey, { cifrado, iv }: Cifrado): Promise<string> {
  const datos = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, clave, cifrado);
  return new TextDecoder().decode(datos);
}
