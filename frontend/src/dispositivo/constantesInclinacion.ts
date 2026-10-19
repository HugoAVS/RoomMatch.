/* Valores que comparten la tarjeta y el indicador de inclinación. */

/** Grados de inclinación a partir de los cuales cuenta como decisión. */
export const UMBRAL_GRADOS = 25;

/** Tope visual: la tarjeta no se mueve más allá de esta inclinación. */
export const LIMITE_VISUAL_GRADOS = 35;

/**
 * Después de decidir con una inclinación, hay que volver cerca del centro antes
 * de poder decidir la tarjeta siguiente. Sin esto, con el teléfono todavía
 * inclinado, las tarjetas se irían decidiendo una tras otra solas.
 */
export const ZONA_NEUTRA_GRADOS = 10;

/**
 * Cuánto del camino que le falta recorre la tarjeta en cada fotograma (15 %).
 * Los sensores reales tiemblan aunque tengas el teléfono quieto; si la tarjeta
 * copiara cada lectura, vibraría. Más bajo = más suave pero con más retraso;
 * más alto = más reactivo pero tiembla más.
 */
export const FACTOR_SUAVIZADO = 0.15;
