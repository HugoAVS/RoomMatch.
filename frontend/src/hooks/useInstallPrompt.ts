import { useEffect, useState } from 'react';

/**
 * El navegador dispara `beforeinstallprompt` cuando la app cumple los
 * criterios de instalación (manifest válido + Service Worker + HTTPS o
 * localhost). Guardamos el evento para poder mostrar el prompt más tarde,
 * cuando el usuario toque nuestro propio botón.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function useInstallPrompt() {
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null);
  const [instalada, setInstalada] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches,
  );

  useEffect(() => {
    const alPoderInstalar = (e: Event) => {
      // Sin preventDefault, Chrome muestra su propio banner y perdemos el
      // control de cuándo pedirlo.
      e.preventDefault();
      setEvento(e as BeforeInstallPromptEvent);
    };

    const alInstalar = () => {
      setInstalada(true);
      setEvento(null);
    };

    window.addEventListener('beforeinstallprompt', alPoderInstalar);
    window.addEventListener('appinstalled', alInstalar);

    return () => {
      window.removeEventListener('beforeinstallprompt', alPoderInstalar);
      window.removeEventListener('appinstalled', alInstalar);
    };
  }, []);

  const instalar = async () => {
    if (!evento) return;
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    console.info('[PWA] respuesta a la instalación:', outcome);
    // El evento solo se puede usar una vez.
    setEvento(null);
  };

  return { sePuedeInstalar: evento !== null && !instalada, instalada, instalar };
}
