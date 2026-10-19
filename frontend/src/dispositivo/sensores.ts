/* ============================================================================
   Sensores de orientación (deviceorientation).

   Mide cuánto está inclinado el teléfono. Este módulo solo habla con el
   navegador: no sabe nada de React ni de tarjetas.

   Los tres ángulos que entrega el navegador (en grados):
     · alpha: giro sobre el eje vertical (brújula)
     · beta:  inclinación hacia adelante/atrás  (-180 a 180)
     · gamma: inclinación hacia izquierda/derecha (-90 a 90)  ← la que usamos

   Solo existen en un teléfono y solo se entregan en contexto seguro (HTTPS o
   localhost).
   ========================================================================== */

export type PermisoOrientacion = 'granted' | 'denied' | 'no-soportado';

export interface ControlOrientacion {
  /** La posición actual del teléfono pasa a ser el cero. */
  calibrar(): void;
  /** Deja de escuchar los sensores. */
  detener(): void;
}

const LIMITE_GRADOS = 90;

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

/**
 * iOS (Safari 13+) exige pedir permiso EXPLÍCITO para leer los sensores, y solo
 * lo concede si la petición ocurre dentro de un gesto del usuario (un clic). Por
 * eso esta función hay que llamarla directamente desde un manejador de clic.
 * Android y los navegadores de escritorio no piden nada.
 */
export async function pedirPermisoOrientacion(): Promise<PermisoOrientacion> {
  if (typeof DeviceOrientationEvent === 'undefined') return 'no-soportado';

  // requestPermission no está en los tipos estándar de TypeScript: solo existe en iOS.
  const evento = DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };

  if (typeof evento.requestPermission === 'function') {
    try {
      return await evento.requestPermission();
    } catch {
      return 'denied';
    }
  }
  return 'granted';
}

/**
 * ¿Este dispositivo tiene sensores de verdad?
 *
 * Que exista `DeviceOrientationEvent` no basta: un computador de escritorio lo
 * tiene definido, pero el único evento que dispara trae todos los ángulos en
 * null. Hay que esperar un evento con valores reales; si no llega ninguno, no
 * hay sensores.
 */
export function hayOrientacionReal(esperaMs = 600): Promise<boolean> {
  return new Promise((resolver) => {
    const terminar = (hay: boolean) => {
      window.clearTimeout(temporizador);
      window.removeEventListener('deviceorientation', alEvento);
      resolver(hay);
    };
    const alEvento = (e: DeviceOrientationEvent) => {
      if (e.beta !== null || e.gamma !== null) terminar(true);
    };
    const temporizador = window.setTimeout(() => terminar(false), esperaMs);
    window.addEventListener('deviceorientation', alEvento);
  });
}

/**
 * Empieza a escuchar la inclinación y la entrega RELATIVA a una referencia.
 *
 * ¿Por qué relativa? Nadie sostiene el teléfono exactamente a 0°. Si se usara el
 * ángulo absoluto, al activar los sensores la tarjeta saltaría de golpe a una
 * posición rara. La primera lectura (o la que fije el usuario con "Calibrar")
 * pasa a ser el cero.
 *
 * @param alInclinar recibe (beta, gamma) en grados, relativos y limitados a ±90°
 * @param intervaloMs el sensor dispara más de 60 veces por segundo; se limita
 *                    a ~30 para no recalcular la pantalla sin necesidad
 */
export function iniciarControlOrientacion(
  alInclinar: (beta: number, gamma: number) => void,
  intervaloMs = 33,
): ControlOrientacion {
  let referencia: { beta: number; gamma: number } | null = null;
  let ultimaLectura: { beta: number; gamma: number } | null = null;
  let ultimoAviso = 0;

  const manejador = (e: DeviceOrientationEvent) => {
    if (e.beta === null || e.gamma === null) return;

    ultimaLectura = { beta: e.beta, gamma: e.gamma };
    if (!referencia) referencia = { ...ultimaLectura }; // la primera lectura = cero

    const ahora = performance.now();
    if (ahora - ultimoAviso < intervaloMs) return;
    ultimoAviso = ahora;

    // Límite de ±90°: con ángulos de Euler, cerca de la vertical los ejes se
    // vuelven inestables (bloqueo de cardán). Limitar el rango evita los saltos.
    alInclinar(
      limitar(e.beta - referencia.beta, -LIMITE_GRADOS, LIMITE_GRADOS),
      limitar(e.gamma - referencia.gamma, -LIMITE_GRADOS, LIMITE_GRADOS),
    );
  };

  window.addEventListener('deviceorientation', manejador);

  return {
    calibrar() {
      referencia = ultimaLectura ? { ...ultimaLectura } : null;
      // Se avisa de inmediato. Un sensor simulado solo dispara un evento cuando
      // su valor cambia, y sin este aviso la pantalla se quedaría en la posición
      // vieja hasta la lectura siguiente.
      alInclinar(0, 0);
    },
    detener() {
      window.removeEventListener('deviceorientation', manejador);
    },
  };
}
