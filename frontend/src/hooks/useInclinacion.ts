import { useCallback, useEffect, useRef, useState } from 'react';
import {
  hayOrientacionReal,
  iniciarControlOrientacion,
  pedirPermisoOrientacion,
  type ControlOrientacion,
} from '../dispositivo/sensores';

/**
 * Inclinación del teléfono de izquierda a derecha, en grados y relativa a la
 * posición en que se activó (o se calibró).
 *
 * Por defecto está APAGADA: leer sensores gasta batería y en iOS hay que pedir
 * permiso, así que solo se activa cuando el usuario toca el botón.
 */
export function useInclinacion() {
  const [activa, setActiva] = useState(false);
  const [grados, setGrados] = useState(0);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const control = useRef<ControlOrientacion | null>(null);
  const ocupado = useRef(false); // evita un segundo clic mientras se pide el permiso

  const apagar = useCallback(() => {
    control.current?.detener();
    control.current = null;
    setActiva(false);
    setGrados(0);
  }, []);

  /** Primer clic: enciende. Segundo clic: apaga. */
  const alternar = useCallback(async () => {
    if (ocupado.current) return;

    if (control.current) {
      apagar();
      setMensaje(null);
      return;
    }

    ocupado.current = true;
    setMensaje(null);
    try {
      // Tiene que ser lo PRIMERO que ocurre dentro del clic: iOS descarta el
      // permiso si antes hubo otra espera.
      const permiso = await pedirPermisoOrientacion();

      if (permiso === 'denied') {
        setMensaje('Denegaste el acceso a los sensores. Sigue disponible arrastrar la tarjeta o usar los botones.');
        return;
      }

      // "Denegaste" (el usuario eligió que no) y "no hay sensores" (el
      // dispositivo no puede) son situaciones distintas: se explican distinto.
      if (permiso === 'no-soportado' || !(await hayOrientacionReal())) {
        setMensaje(
          window.isSecureContext
            ? 'Este dispositivo no tiene sensores de orientación. Arrastra la tarjeta o usa los botones.'
            : 'Los sensores solo funcionan en HTTPS o en localhost. Arrastra la tarjeta o usa los botones.',
        );
        return;
      }

      control.current = iniciarControlOrientacion((_beta, gamma) => setGrados(gamma));
      setActiva(true);
    } finally {
      ocupado.current = false;
    }
  }, [apagar]);

  const calibrar = useCallback(() => control.current?.calibrar(), []);

  // Al salir de la pantalla los sensores se apagan: no se deja nada escuchando.
  useEffect(
    () => () => {
      control.current?.detener();
      control.current = null;
    },
    [],
  );

  return { activa, grados, mensaje, alternar, calibrar };
}
