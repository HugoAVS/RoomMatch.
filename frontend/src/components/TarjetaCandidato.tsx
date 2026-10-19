import { useEffect, useRef, useState } from 'react';
import {
  FACTOR_SUAVIZADO,
  LIMITE_VISUAL_GRADOS,
  UMBRAL_GRADOS,
} from '../dispositivo/constantesInclinacion';
import type { Candidato, Decision } from '../tipos';
import { ETIQUETAS, formatearPrecio } from '../tipos';

const UMBRAL = 110; // píxeles de arrastre para que cuente como decisión
const PX_POR_GRADO = UMBRAL / UMBRAL_GRADOS; // 25° de inclinación = 110 px de arrastre

interface Props {
  candidato: Candidato;
  alDecidir: (decision: Decision) => void;
  /**
   * Inclinación del teléfono en grados (+ derecha, − izquierda), o null si el
   * control por inclinación está apagado. Cuando no es null, la tarjeta sigue
   * la inclinación y deja de responder al arrastre: dos controles peleando por
   * la misma tarjeta se ven fatal.
   */
  inclinacion?: number | null;
}

/**
 * Tarjeta arrastrable. Se usan Pointer Events (no mouse/touch por separado)
 * para que funcione igual con dedo, mouse y lápiz, que es lo que se espera de
 * una PWA instalada en un celular. También se puede mover inclinando el teléfono.
 */
export function TarjetaCandidato({ candidato, alDecidir, inclinacion = null }: Props) {
  const [desplazamiento, setDesplazamiento] = useState(0);
  const [soltando, setSoltando] = useState(false);
  const inicioX = useRef(0);
  const arrastrando = useRef(false);
  const lanzada = useRef(false); // ya se decidió: no admite otra decisión

  const porInclinacion = inclinacion !== null;
  const objetivoPx = useRef(0); // adónde debe llegar la tarjeta (px)
  const posicionPx = useRef(0); // dónde está dibujada ahora (px)

  /** Lanza la tarjeta fuera de la pantalla y recién entonces avisa al padre. */
  const lanzar = (decision: Decision) => {
    if (lanzada.current) return;
    lanzada.current = true;
    arrastrando.current = false;
    setSoltando(true);
    setDesplazamiento(decision === 'LIKE' ? 1000 : -1000);
    window.setTimeout(() => alDecidir(decision), 180);
  };

  const alPresionar = (e: React.PointerEvent) => {
    if (porInclinacion || lanzada.current) return;
    arrastrando.current = true;
    inicioX.current = e.clientX;
    setSoltando(false);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const alMover = (e: React.PointerEvent) => {
    if (!arrastrando.current) return;
    setDesplazamiento(e.clientX - inicioX.current);
  };

  const alSoltar = () => {
    if (!arrastrando.current) return;
    arrastrando.current = false;

    if (Math.abs(desplazamiento) > UMBRAL) {
      lanzar(desplazamiento > 0 ? 'LIKE' : 'PASS');
      return;
    }

    setSoltando(true);
    setDesplazamiento(0);
  };

  // ---- Control por inclinación ----------------------------------------------

  // 1. Cada lectura nueva fija el OBJETIVO; y si se pasó del umbral, es una decisión.
  useEffect(() => {
    if (inclinacion === null) return;
    const limitada = Math.max(-LIMITE_VISUAL_GRADOS, Math.min(LIMITE_VISUAL_GRADOS, inclinacion));
    objetivoPx.current = limitada * PX_POR_GRADO;
    if (Math.abs(inclinacion) >= UMBRAL_GRADOS) lanzar(inclinacion > 0 ? 'LIKE' : 'PASS');
  }, [inclinacion]);

  // 2. En cada fotograma, la tarjeta avanza un 15 % del camino que le falta.
  useEffect(() => {
    if (!porInclinacion) return;
    let fotograma = 0;

    const paso = () => {
      const falta = objetivoPx.current - posicionPx.current;
      if (!lanzada.current && Math.abs(falta) > 0.05) {
        posicionPx.current += falta * FACTOR_SUAVIZADO;
        setSoltando(false);
        setDesplazamiento(posicionPx.current);
      }
      fotograma = requestAnimationFrame(paso);
    };

    fotograma = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(fotograma);
  }, [porInclinacion]);

  // 3. Al apagar la inclinación, la tarjeta vuelve al centro.
  useEffect(() => {
    if (porInclinacion || lanzada.current) return;
    posicionPx.current = 0;
    objetivoPx.current = 0;
    setSoltando(true);
    setDesplazamiento(0);
  }, [porInclinacion]);

  const rotacion = desplazamiento / 18;
  const intencion = desplazamiento > 60 ? 'like' : desplazamiento < -60 ? 'pass' : null;

  return (
    <article
      onPointerDown={alPresionar}
      onPointerMove={alMover}
      onPointerUp={alSoltar}
      onPointerCancel={alSoltar}
      style={{
        transform: `translateX(${desplazamiento}px) rotate(${rotacion}deg)`,
        transition: soltando ? 'transform 180ms ease-out' : 'none',
      }}
      className="relative cursor-grab touch-none select-none overflow-hidden rounded-card bg-white shadow-card ring-1 ring-petroleo/5 active:cursor-grabbing"
    >
      {/* Sellos de intención mientras se arrastra */}
      {intencion && (
        <span
          className={`absolute top-6 z-10 rounded-lg border-4 px-3 py-1 text-lg font-black uppercase tracking-wider ${
            intencion === 'like'
              ? 'left-6 -rotate-12 border-menta text-menta'
              : 'right-6 rotate-12 border-coral text-coral'
          }`}
        >
          {intencion === 'like' ? 'Sí' : 'No'}
        </span>
      )}

      <header className="flex items-center gap-4 bg-petroleo px-5 py-5 text-white">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-3xl">
          {candidato.avatar}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold">
            {candidato.fullName}, {candidato.edad}
          </h2>
          <p className="truncate text-xs text-menta">{candidato.ocupacion}</p>
          <p className="mt-0.5 text-xs text-white/60">📍 {candidato.ciudad}</p>
        </div>
        <div className="shrink-0 text-center">
          <div className="text-2xl font-black text-menta">{candidato.compatibilidad.porcentaje}%</div>
          <div className="text-[0.6rem] uppercase tracking-wide text-white/60">afinidad</div>
        </div>
      </header>

      <div className="space-y-4 px-5 py-5">
        <p className="text-sm leading-relaxed text-gris-texto">{candidato.bio}</p>

        <div className="flex flex-wrap gap-1.5">
          <Etiqueta>{ETIQUETAS.horario[candidato.horario]}</Etiqueta>
          <Etiqueta>{ETIQUETAS.orden[candidato.orden]}</Etiqueta>
          <Etiqueta>{ETIQUETAS.sociabilidad[candidato.sociabilidad]}</Etiqueta>
          {candidato.mascotas && <Etiqueta>🐾 Mascotas</Etiqueta>}
          {candidato.fumador && <Etiqueta>🚬 Fuma</Etiqueta>}
        </div>

        <div className="rounded-xl bg-gris-fondo px-4 py-3">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-gris-texto/60">
            Presupuesto
          </p>
          <p className="text-sm font-bold text-petroleo">
            {formatearPrecio(candidato.presupuesto)} / mes
          </p>
        </div>

        {candidato.compatibilidad.coincidencias.length > 0 && (
          <ul className="space-y-1">
            {candidato.compatibilidad.coincidencias.slice(0, 3).map((coincidencia) => (
              <li key={coincidencia} className="flex items-center gap-2 text-xs text-gris-texto">
                <span className="text-menta">✓</span>
                {coincidencia}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-petroleo/5 px-2.5 py-1 text-[0.7rem] font-medium text-petroleo">
      {children}
    </span>
  );
}
