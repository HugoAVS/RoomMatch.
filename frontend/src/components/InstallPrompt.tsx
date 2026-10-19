import { useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

/** Tarjeta flotante que invita a instalar la app. Se puede descartar. */
export function InstallPrompt() {
  const { sePuedeInstalar, instalar } = useInstallPrompt();
  const [descartado, setDescartado] = useState(false);

  if (!sePuedeInstalar || descartado) return null;

  return (
    <div className="fixed bottom-24 left-1/2 z-40 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 rounded-card bg-white p-4 shadow-xl ring-1 ring-petroleo/10">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-petroleo text-lg">
          🏡
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-petroleo">Instala RoomMatch</p>
          <p className="mt-0.5 text-xs leading-relaxed text-gris-texto">
            Ábrela desde tu pantalla de inicio y úsala incluso sin internet.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={instalar}
              className="rounded-full bg-petroleo px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
            >
              Instalar
            </button>
            <button
              type="button"
              onClick={() => setDescartado(true)}
              className="rounded-full px-3 py-2 text-xs font-semibold text-gris-texto transition hover:bg-gris-fondo"
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
