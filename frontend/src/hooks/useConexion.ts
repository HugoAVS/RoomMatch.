import { useEffect, useState } from 'react';
import { contarPendientes, solicitarSincronizacion } from '../pwa/colaSwipes';

/**
 * Estado de la conexión y de la cola de swipes pendientes.
 *
 * navigator.onLine responde si hay interfaz de red, no si el servidor
 * responde, así que se complementa con los eventos online/offline y con los
 * avisos que manda el Service Worker al terminar de sincronizar.
 */
export function useConexion() {
  const [enLinea, setEnLinea] = useState(navigator.onLine);
  const [pendientes, setPendientes] = useState(0);

  const refrescarPendientes = () => {
    contarPendientes().then(setPendientes).catch(() => setPendientes(0));
  };

  useEffect(() => {
    refrescarPendientes();

    const alConectar = () => {
      setEnLinea(true);
      solicitarSincronizacion();
    };
    const alDesconectar = () => setEnLinea(false);

    window.addEventListener('online', alConectar);
    window.addEventListener('offline', alDesconectar);

    // El Service Worker avisa cuando terminó de reenviar la cola.
    const alMensaje = (evento: MessageEvent) => {
      if (evento.data?.tipo === 'SWIPES_SINCRONIZADOS') refrescarPendientes();
    };
    navigator.serviceWorker?.addEventListener('message', alMensaje);

    // Red de seguridad: la cola también se revisa cada pocos segundos.
    const intervalo = window.setInterval(refrescarPendientes, 4000);

    return () => {
      window.removeEventListener('online', alConectar);
      window.removeEventListener('offline', alDesconectar);
      navigator.serviceWorker?.removeEventListener('message', alMensaje);
      window.clearInterval(intervalo);
    };
  }, []);

  return { enLinea, pendientes, refrescarPendientes };
}
