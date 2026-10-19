import { useCallback, useEffect, useSyncExternalStore, useState } from 'react';
import {
  bloquear,
  crearBoveda,
  desbloquear,
  estaDesbloqueada,
  existeBoveda,
  restablecerBoveda,
  suscribirBoveda,
} from '../almacenamiento/boveda';
import { criptoDisponible } from '../almacenamiento/cripto';

/**
 * Estado de la bóveda de notas para los componentes.
 *
 * `desbloqueada` vive FUERA de React (la clave está en memoria, en boveda.ts),
 * así que se lee con useSyncExternalStore: React se entera cuando alguien
 * bloquea o desbloquea desde cualquier parte de la app.
 */
export function useBoveda() {
  const desbloqueada = useSyncExternalStore(suscribirBoveda, estaDesbloqueada);

  // null = todavía consultando IndexedDB
  const [existe, setExiste] = useState<boolean | null>(null);

  // crypto.subtle solo existe en HTTPS o localhost; IndexedDB puede faltar en
  // algunos modos de navegación privada.
  const soportada = criptoDisponible() && 'indexedDB' in window;

  const refrescar = useCallback(async () => {
    try {
      setExiste(await existeBoveda());
    } catch {
      setExiste(false);
    }
  }, []);

  useEffect(() => {
    if (soportada) refrescar();
  }, [soportada, refrescar]);

  return {
    soportada,
    existe,
    desbloqueada,
    crear: async (contrasena: string) => {
      await crearBoveda(contrasena);
      await refrescar();
    },
    desbloquear,
    bloquear,
    restablecer: async () => {
      await restablecerBoveda();
      await refrescar();
    },
  };
}
