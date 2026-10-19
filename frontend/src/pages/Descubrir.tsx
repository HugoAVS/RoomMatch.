import { useCallback, useEffect, useState } from 'react';
import { api, SinConexionError } from '../api/cliente';
import { IndicadorInclinacion } from '../components/IndicadorInclinacion';
import { TarjetaCandidato } from '../components/TarjetaCandidato';
import { ZONA_NEUTRA_GRADOS } from '../dispositivo/constantesInclinacion';
import { useInclinacion } from '../hooks/useInclinacion';
import type { Candidato, Decision, Usuario } from '../tipos';

interface Props {
  usuario: Usuario;
}

export function Descubrir({ usuario }: Props) {
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchNuevo, setMatchNuevo] = useState<Candidato | null>(null);
  const [avisoEncolado, setAvisoEncolado] = useState(false);
  const [avisoError, setAvisoError] = useState(false);

  const inclinacion = useInclinacion();
  // Tras decidir inclinando, hay que volver al centro antes de decidir la
  // siguiente tarjeta; si no, con el teléfono aún inclinado se irían decidiendo
  // todas una tras otra.
  const [esperandoCentro, setEsperandoCentro] = useState(false);

  useEffect(() => {
    if (esperandoCentro && Math.abs(inclinacion.grados) < ZONA_NEUTRA_GRADOS) {
      setEsperandoCentro(false);
    }
  }, [esperandoCentro, inclinacion.grados]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setCandidatos(await api.candidatos(usuario.id));
    } catch (e) {
      setError(
        e instanceof SinConexionError
          ? 'Sin conexión y sin candidatos guardados. Conéctate una vez y podrás seguir usando la app sin internet.'
          : 'No pudimos cargar los candidatos.',
      );
    } finally {
      setCargando(false);
    }
  }, [usuario.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const decidir = async (decision: Decision) => {
    const candidato = candidatos[0];
    if (!candidato) return;

    // La tarjeta se quita de inmediato: la interfaz no espera a la red.
    setCandidatos((previos) => previos.slice(1));

    // Si el teléfono sigue inclinado, la tarjeta siguiente espera a que vuelva al centro.
    if (inclinacion.activa && Math.abs(inclinacion.grados) >= ZONA_NEUTRA_GRADOS) {
      setEsperandoCentro(true);
    }

    try {
      const resultado = await api.swipe(usuario.id, candidato.id, decision);

      if (resultado.encolado) {
        setAvisoEncolado(true);
        window.setTimeout(() => setAvisoEncolado(false), 2600);
        return;
      }
      if (resultado.match) setMatchNuevo(candidato);
    } catch (e) {
      // Un fallo real del servidor no puede pasar desapercibido: se devuelve
      // la tarjeta a la baraja para que la decisión no se pierda.
      console.error('[RoomMatch] no se pudo registrar el swipe', e);
      setCandidatos((previos) => [candidato, ...previos]);
      setAvisoError(true);
      window.setTimeout(() => setAvisoError(false), 3000);
    }
  };

  if (cargando) {
    return <Centrado><p className="text-sm text-gris-texto">Buscando compañeros…</p></Centrado>;
  }

  if (error) {
    return (
      <Centrado>
        <span className="text-4xl">📡</span>
        <p className="max-w-xs text-sm text-gris-texto">{error}</p>
        <button
          onClick={cargar}
          className="rounded-full bg-petroleo px-6 py-2.5 text-sm font-semibold text-white"
        >
          Reintentar
        </button>
      </Centrado>
    );
  }

  const actual = candidatos[0];

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-28 pt-4">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-petroleo">Descubrir</h1>
        <p className="text-xs text-gris-texto">
          {candidatos.length > 0
            ? `${candidatos.length} ${candidatos.length === 1 ? 'persona' : 'personas'} por revisar`
            : 'Ya revisaste a todos por ahora'}
        </p>
      </header>

      {actual ? (
        <>
          <TarjetaCandidato
            key={actual.id}
            candidato={actual}
            alDecidir={decidir}
            inclinacion={inclinacion.activa ? (esperandoCentro ? 0 : inclinacion.grados) : null}
          />

          <div className="mt-6 flex items-center justify-center gap-6">
            <BotonDecision
              onClick={() => decidir('PASS')}
              clase="bg-white text-coral ring-1 ring-coral/25"
              etiqueta="Descartar"
            >
              ✕
            </BotonDecision>
            <BotonDecision
              onClick={() => decidir('LIKE')}
              clase="bg-petroleo text-menta"
              etiqueta="Me interesa"
            >
              ♥
            </BotonDecision>
          </div>

          <p className="mt-4 text-center text-[0.7rem] text-gris-texto/60">
            Arrastra la tarjeta o usa los botones
          </p>

          {/* Control por inclinación (sensores de orientación) */}
          <section className="mt-5 space-y-3 rounded-card bg-white px-4 py-4 shadow-card ring-1 ring-petroleo/5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={inclinacion.alternar}
                aria-pressed={inclinacion.activa}
                className={`flex-1 rounded-full px-4 py-2.5 text-xs font-semibold transition ${
                  inclinacion.activa
                    ? 'bg-menta text-petroleo'
                    : 'bg-petroleo text-white hover:opacity-90'
                }`}
              >
                {inclinacion.activa
                  ? '📱 Inclinación ACTIVA (toca para apagar)'
                  : '📱 Decidir inclinando el teléfono'}
              </button>

              {inclinacion.activa && (
                <button
                  type="button"
                  onClick={inclinacion.calibrar}
                  className="rounded-full px-4 py-2.5 text-xs font-semibold text-petroleo ring-1 ring-petroleo/20 transition hover:bg-gris-fondo"
                >
                  Calibrar
                </button>
              )}
            </div>

            {inclinacion.activa && (
              <>
                <IndicadorInclinacion grados={inclinacion.grados} />
                <p className="text-center text-[0.68rem] leading-relaxed text-gris-texto/70">
                  Inclina a la derecha para aceptar y a la izquierda para descartar. «Calibrar»
                  toma la posición actual como centro.
                </p>
              </>
            )}

            {inclinacion.mensaje && (
              <p role="status" className="rounded-xl bg-gris-fondo px-3 py-2 text-xs leading-relaxed text-gris-texto">
                {inclinacion.mensaje}
              </p>
            )}
          </section>
        </>
      ) : (
        <Centrado>
          <span className="text-4xl">🎉</span>
          <p className="max-w-xs text-sm text-gris-texto">
            No quedan más personas por revisar. Vuelve más tarde: siempre entra gente nueva.
          </p>
        </Centrado>
      )}

      {avisoEncolado && (
        <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full bg-petroleo px-5 py-2.5 text-xs font-semibold text-white shadow-lg">
          Guardado sin conexión · se enviará solo
        </div>
      )}

      {avisoError && (
        <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full bg-coral px-5 py-2.5 text-xs font-semibold text-white shadow-lg">
          No se pudo registrar tu decisión
        </div>
      )}

      {matchNuevo && <ModalMatch candidato={matchNuevo} alCerrar={() => setMatchNuevo(null)} />}
    </div>
  );
}

function Centrado({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      {children}
    </div>
  );
}

function BotonDecision({
  onClick,
  clase,
  etiqueta,
  children,
}: {
  onClick: () => void;
  clase: string;
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl shadow-card transition active:scale-95 ${clase}`}
    >
      {children}
    </button>
  );
}

function ModalMatch({ candidato, alCerrar }: { candidato: Candidato; alCerrar: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-petroleo/90 px-6 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-card bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-menta/15 text-4xl">
          {candidato.avatar}
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-menta">¡Es un match!</p>
        <h2 className="mt-1 text-2xl font-bold text-petroleo">{candidato.fullName}</h2>
        <p className="mt-2 text-sm text-gris-texto">
          También le interesa vivir contigo. Tienen un {candidato.compatibilidad.porcentaje}% de
          afinidad.
        </p>
        <button
          onClick={alCerrar}
          className="mt-6 w-full rounded-full bg-petroleo py-3 text-sm font-semibold text-white"
        >
          Seguir buscando
        </button>
      </div>
    </div>
  );
}
