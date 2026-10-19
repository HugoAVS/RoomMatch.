import { useCallback, useEffect, useRef, useState } from 'react';
import {
  capturarFoto,
  describirErrorCamara,
  detenerCamara,
  iniciarCamara,
} from '../dispositivo/camara';

interface Props {
  /** Se llama con la foto ya capturada, cuando el usuario la acepta. */
  alGuardar: (foto: Blob) => Promise<void>;
  alCerrar: () => void;
}

type Fase = 'inicio' | 'solicitando' | 'en-vivo' | 'capturada';

const AVISO_PAGINA_OCULTA =
  'La cámara se apagó al salir de la página. Vuelve a activarla cuando quieras.';

/**
 * Toma la foto de perfil con la cámara, con vista previa en vivo.
 *
 * Son DOS CAPAS apiladas: el <video> con la imagen de la cámara, y encima una
 * guía en forma de óvalo (sin eventos de puntero, para no estorbar).
 *
 * Reglas del flujo abierto:
 *  · se enciende solo con un clic del usuario (nunca al abrir el modal);
 *  · se apaga al capturar, al cerrar, al desmontar y al salir de la pestaña;
 *  · NO se reactiva sola al volver: sería abrir la cámara sin que lo pida.
 */
export function CapturaFoto({ alGuardar, alCerrar }: Props) {
  const [fase, setFase] = useState<Fase>('inicio');
  const [aviso, setAviso] = useState<string | null>(null);
  const [captura, setCaptura] = useState<{ imagen: Blob; url: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const video = useRef<HTMLVideoElement>(null);
  const flujo = useRef<MediaStream | null>(null);
  // Cada intento de encender lleva un número. Si mientras se esperaba el permiso
  // el usuario cerró el modal o se ocultó la página, el número ya no coincide y
  // el flujo que llega tarde se apaga en vez de quedar abierto sin dueño.
  const intento = useRef(0);

  const apagar = useCallback(() => {
    detenerCamara(video.current, flujo.current);
    flujo.current = null;
  }, []);

  /** Primer clic: enciende. */
  const encender = async () => {
    if (!video.current) return;
    const mio = ++intento.current;
    setAviso(null);
    setFase('solicitando');

    try {
      const nuevo = await iniciarCamara(video.current);

      if (mio !== intento.current || document.hidden) {
        nuevo.getTracks().forEach((pista) => pista.stop());
        if (mio === intento.current) {
          apagar();
          setFase('inicio');
          setAviso(AVISO_PAGINA_OCULTA);
        }
        return;
      }

      flujo.current = nuevo;
      setFase('en-vivo');
    } catch (error) {
      if (mio !== intento.current) return;
      apagar();
      setFase('inicio');
      setAviso(describirErrorCamara(error));
    }
  };

  const tomar = async () => {
    if (!video.current) return;
    try {
      const imagen = await capturarFoto(video.current);
      apagar(); // ya no hace falta el flujo: se apaga ANTES de mostrar el resultado
      setCaptura({ imagen, url: URL.createObjectURL(imagen) });
      setFase('capturada');
    } catch {
      setAviso('No se pudo tomar la foto. Inténtalo de nuevo.');
    }
  };

  const repetir = () => {
    if (captura) URL.revokeObjectURL(captura.url);
    setCaptura(null);
    encender(); // es un clic del usuario, así que puede abrir la cámara
  };

  const usar = async () => {
    if (!captura) return;
    setGuardando(true);
    try {
      await alGuardar(captura.imagen);
      alCerrar();
    } catch {
      setAviso('No se pudo guardar la foto en este dispositivo.');
      setGuardando(false);
    }
  };

  // Salir de la pestaña (o minimizar el navegador) apaga la cámara.
  useEffect(() => {
    const alCambiarVisibilidad = () => {
      if (document.hidden && flujo.current) {
        apagar();
        setFase('inicio');
        setAviso(AVISO_PAGINA_OCULTA);
      }
    };
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    return () => document.removeEventListener('visibilitychange', alCambiarVisibilidad);
  }, [apagar]);

  // Al cerrar el modal: se cancela cualquier intento pendiente y se apaga todo.
  useEffect(
    () => () => {
      intento.current++;
      detenerCamara(video.current, flujo.current);
      flujo.current = null;
    },
    [],
  );

  // Se libera la URL temporal de la foto capturada.
  useEffect(
    () => () => {
      if (captura) URL.revokeObjectURL(captura.url);
    },
    [captura],
  );

  useEffect(() => {
    const alTecla = (e: KeyboardEvent) => e.key === 'Escape' && alCerrar();
    window.addEventListener('keydown', alTecla);
    return () => window.removeEventListener('keydown', alTecla);
  }, [alCerrar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-petroleo/70 backdrop-blur-sm sm:items-center"
      onClick={alCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Foto de perfil"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-card bg-white p-5 shadow-xl sm:rounded-card"
      >
        <header className="mb-4 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-petroleo">Foto de perfil</h2>
            <p className="text-[0.7rem] text-gris-texto">📍 Se guarda solo en este dispositivo</p>
          </div>
          <button
            onClick={alCerrar}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gris-texto transition hover:bg-gris-fondo"
          >
            ✕
          </button>
        </header>

        {/* ---- El visor: capa 1 = video, capa 2 = guía ---- */}
        <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-card bg-petroleo">
          <video
            ref={video}
            playsInline
            muted
            hidden={fase !== 'en-vivo'}
            // -scale-x-100 = vista previa en espejo, como un espejo de verdad
            className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
          />

          {fase === 'en-vivo' && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="h-[78%] w-[62%] rounded-[50%] ring-2 ring-white/80 shadow-[0_0_0_999px_rgba(11,18,32,0.5)]" />
            </div>
          )}

          {fase === 'capturada' && captura && (
            <img src={captura.url} alt="Vista previa de tu foto" className="absolute inset-0 h-full w-full object-cover" />
          )}

          {(fase === 'inicio' || fase === 'solicitando') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
              <span className="text-5xl">{fase === 'solicitando' ? '⏳' : '📷'}</span>
              <span className="text-xs text-white/70">
                {fase === 'solicitando' ? 'Esperando el permiso…' : 'La cámara está apagada'}
              </span>
            </div>
          )}

          {fase === 'en-vivo' && (
            <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-coral px-2.5 py-1 text-[0.65rem] font-bold text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              CÁMARA ACTIVA
            </span>
          )}
        </div>

        {aviso && (
          <p role="alert" className="mt-3 rounded-xl bg-gris-fondo px-3 py-2.5 text-xs leading-relaxed text-gris-texto">
            {aviso}
          </p>
        )}

        {/* ---- Botones según la fase ---- */}
        <div className="mt-4 space-y-2">
          {fase === 'inicio' && (
            <button
              type="button"
              onClick={encender}
              className="w-full rounded-full bg-petroleo py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              📷 Activar cámara
            </button>
          )}

          {fase === 'solicitando' && (
            <button type="button" disabled className="w-full rounded-full bg-petroleo/40 py-3 text-sm font-semibold text-white">
              Esperando…
            </button>
          )}

          {fase === 'en-vivo' && (
            <>
              <button
                type="button"
                onClick={tomar}
                className="w-full rounded-full bg-menta py-3 text-sm font-bold text-petroleo transition hover:opacity-90"
              >
                Tomar foto
              </button>
              <button
                type="button"
                onClick={() => {
                  apagar();
                  setFase('inicio');
                }}
                className="w-full rounded-full py-2.5 text-xs font-semibold text-gris-texto ring-1 ring-petroleo/15 transition hover:bg-gris-fondo"
              >
                Apagar cámara
              </button>
            </>
          )}

          {fase === 'capturada' && (
            <>
              <button
                type="button"
                onClick={usar}
                disabled={guardando}
                className="w-full rounded-full bg-petroleo py-3 text-sm font-semibold text-white transition disabled:opacity-50"
              >
                {guardando ? 'Guardando…' : 'Usar esta foto'}
              </button>
              <button
                type="button"
                onClick={repetir}
                disabled={guardando}
                className="w-full rounded-full py-2.5 text-xs font-semibold text-gris-texto ring-1 ring-petroleo/15 transition hover:bg-gris-fondo"
              >
                Repetir
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
