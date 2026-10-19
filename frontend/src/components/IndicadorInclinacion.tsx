import { LIMITE_VISUAL_GRADOS, UMBRAL_GRADOS } from '../dispositivo/constantesInclinacion';

/**
 * Barra que muestra cuánto está inclinado el teléfono. Las marcas de los
 * extremos son el umbral: pasarlas es decidir (derecha = me interesa,
 * izquierda = descartar).
 */
export function IndicadorInclinacion({ grados }: { grados: number }) {
  const limitada = Math.max(-LIMITE_VISUAL_GRADOS, Math.min(LIMITE_VISUAL_GRADOS, grados));
  const posicion = 50 + (limitada / LIMITE_VISUAL_GRADOS) * 50; // 0 % a 100 %
  const marca = (UMBRAL_GRADOS / LIMITE_VISUAL_GRADOS) * 50; // distancia del centro al umbral
  const pasoUmbral = Math.abs(grados) >= UMBRAL_GRADOS;

  return (
    <div className="w-full" role="status" aria-label="Inclinación del teléfono">
      <div className="relative h-2 rounded-full bg-petroleo/10">
        {/* Zonas de decisión */}
        <span className="absolute inset-y-0 left-0 rounded-l-full bg-coral/25" style={{ width: `${50 - marca}%` }} />
        <span className="absolute inset-y-0 right-0 rounded-r-full bg-menta/30" style={{ width: `${50 - marca}%` }} />
        {/* Centro */}
        <span className="absolute inset-y-[-2px] left-1/2 w-px -translate-x-1/2 bg-petroleo/30" />
        {/* Posición actual */}
        <span
          className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white transition-colors ${
            pasoUmbral ? (grados > 0 ? 'bg-menta' : 'bg-coral') : 'bg-petroleo'
          }`}
          style={{ left: `${posicion}%` }}
        />
      </div>

      <div className="mt-1.5 flex justify-between text-[0.65rem] font-semibold text-gris-texto/70">
        <span>← Descartar</span>
        <span data-testid="grados" className="tabular-nums text-petroleo">
          {grados > 0 ? '+' : ''}
          {Math.round(grados)}°
        </span>
        <span>Me interesa →</span>
      </div>
    </div>
  );
}
