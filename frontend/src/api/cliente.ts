/* ============================================================================
   Cliente de la API.

   Todas las llamadas al backend pasan por aquí. Si cambia la URL del servidor
   o el manejo de errores, se toca un solo archivo.
   ========================================================================== */

import type { Candidato, Match, Propiedad, Usuario, Decision } from '../tipos';
import { encolarSwipe, solicitarSincronizacion } from '../pwa/colaSwipes';

// Vacío = mismo origen. Vite reenvía /api al backend (ver vite.config.ts), así
// que no hay CORS y el Service Worker trata la API como un recurso propio.
const API = import.meta.env.VITE_API_URL ?? '';

export class SinConexionError extends Error {
  constructor() {
    super('Sin conexión con el servidor');
    this.name = 'SinConexionError';
  }
}

async function pedir<T>(ruta: string, opciones?: RequestInit): Promise<T> {
  let respuesta: Response;

  try {
    respuesta = await fetch(`${API}${ruta}`, {
      ...opciones,
      headers: {
        // Content-Type solo cuando hay cuerpo: ponerlo en un GET dispara una
        // petición de verificación (preflight) que no hace falta.
        ...(opciones?.body ? { 'Content-Type': 'application/json' } : {}),
        ...opciones?.headers,
      },
    });
  } catch {
    // fetch rechaza con TypeError cuando no hay red.
    throw new SinConexionError();
  }

  // 503 es el código que devuelve nuestro Service Worker cuando no tiene ni
  // red ni copia guardada.
  if (respuesta.status === 503) throw new SinConexionError();

  if (!respuesta.ok) {
    const detalle = await respuesta.json().catch(() => ({}));
    throw new Error(detalle.error ?? `Error ${respuesta.status}`);
  }

  return respuesta.json() as Promise<T>;
}

export const api = {
  usuarioDemo: () => pedir<Usuario>('/api/usuarios/demo'),

  actualizarPerfil: (id: string, cambios: Partial<Usuario>) =>
    pedir<Usuario>(`/api/usuarios/${id}`, { method: 'PATCH', body: JSON.stringify(cambios) }),

  candidatos: (usuarioId: string) => pedir<Candidato[]>(`/api/usuarios/${usuarioId}/candidatos`),

  matches: (usuarioId: string) => pedir<Match[]>(`/api/matches?usuarioId=${usuarioId}`),

  propiedades: (filtros: { ciudad?: string; maxPrecio?: number } = {}) => {
    const params = new URLSearchParams();
    if (filtros.ciudad) params.set('ciudad', filtros.ciudad);
    if (filtros.maxPrecio) params.set('maxPrecio', String(filtros.maxPrecio));
    const query = params.toString();
    return pedir<Propiedad[]>(`/api/propiedades${query ? `?${query}` : ''}`);
  },

  ciudades: () => pedir<string[]>('/api/propiedades/ciudades'),

  /**
   * Envía una decisión. Si no hay conexión, la guarda en IndexedDB y pide al
   * Service Worker que la reenvíe cuando vuelva el internet.
   *
   * La app nunca se queda bloqueada por falta de red: devuelve `encolado: true`
   * y la interfaz sigue como si nada.
   */
  async swipe(autorId: string, objetivoId: string, decision: Decision) {
    try {
      const resultado = await pedir<{ match: boolean; compañero?: Usuario }>('/api/swipes', {
        method: 'POST',
        body: JSON.stringify({ autorId, objetivoId, decision }),
      });
      return { ...resultado, encolado: false };
    } catch (error) {
      if (!(error instanceof SinConexionError)) throw error;

      await encolarSwipe({ autorId, objetivoId, decision });
      await solicitarSincronizacion();
      return { match: false, encolado: true } as const;
    }
  },
};
