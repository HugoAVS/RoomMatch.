import { useCallback, useEffect, useState } from 'react';
import { guardarNota, leerNota, obtenerBd, LARGO_MINIMO_CONTRASENA } from '../almacenamiento/boveda';
import {
  ETIQUETAS_NOTA,
  eliminarNota,
  notasDeMatch,
  type Etiqueta,
  type NotaGuardada,
} from '../almacenamiento/notas';
import { useBoveda } from '../hooks/useBoveda';

interface Props {
  matchId: string;
  nombre: string;
  avatar: string;
  alCerrar: () => void;
}

type Filtro = Etiqueta | 'TODAS';

const ETIQUETAS = Object.keys(ETIQUETAS_NOTA) as Etiqueta[];

/**
 * Notas privadas sobre un match. Cifradas con una clave derivada de una
 * contraseña que solo conoce el usuario: nunca salen de este dispositivo.
 */
export function NotasPrivadas({ matchId, nombre, avatar, alCerrar }: Props) {
  const boveda = useBoveda();

  const [notas, setNotas] = useState<NotaGuardada[]>([]);
  // Textos ya descifrados, por id de nota. Se vacía al bloquear.
  const [reveladas, setReveladas] = useState<Record<number, string>>({});
  const [filtro, setFiltro] = useState<Filtro>('TODAS');

  const [contrasena, setContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  const [texto, setTexto] = useState('');
  const [etiqueta, setEtiqueta] = useState<Etiqueta>('POSITIVO');

  const cargar = useCallback(async () => {
    try {
      setNotas(await notasDeMatch(await obtenerBd(), matchId));
    } catch {
      setError('No se pudieron leer las notas guardadas.');
    }
  }, [matchId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Bloquear tiene que borrar también el texto ya descifrado que haya en
  // pantalla; si no, el "candado" sería solo decorativo.
  useEffect(() => {
    if (!boveda.desbloqueada) setReveladas({});
  }, [boveda.desbloqueada]);

  useEffect(() => {
    const alTecla = (e: KeyboardEvent) => e.key === 'Escape' && alCerrar();
    window.addEventListener('keydown', alTecla);
    return () => window.removeEventListener('keydown', alTecla);
  }, [alCerrar]);

  /* ---------------------------------------------------------- acciones */

  const crearBoveda = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (contrasena !== confirmacion) return setError('Las contraseñas no coinciden.');

    setTrabajando(true);
    try {
      await boveda.crear(contrasena);
      setContrasena('');
      setConfirmacion('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTrabajando(false);
    }
  };

  const desbloquear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTrabajando(true);
    try {
      await boveda.desbloquear(contrasena);
      setContrasena('');
    } catch (err) {
      setError(
        (err as Error).name === 'ContrasenaIncorrectaError'
          ? 'Contraseña incorrecta.'
          : 'No se pudo desbloquear la bóveda.',
      );
    } finally {
      setTrabajando(false);
    }
  };

  const olvideLaContrasena = async () => {
    const seguro = window.confirm(
      'No es posible recuperar una contraseña olvidada: las notas están cifradas con ella.\n\n' +
        '¿Borrar TODAS las notas privadas y empezar con una contraseña nueva?',
    );
    if (!seguro) return;
    await boveda.restablecer();
    setNotas([]);
    setContrasena('');
    setError(null);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio) return;

    setError(null);
    try {
      const id = await guardarNota(matchId, etiqueta, limpio);
      // Se acaba de escribir: ya se conoce el texto, no hace falta descifrarlo.
      setReveladas((previas) => ({ ...previas, [id]: limpio }));
      setTexto('');
      await cargar();
    } catch {
      setError('No se pudo guardar la nota.');
    }
  };

  const alternar = async (nota: NotaGuardada) => {
    const id = nota.id!;
    if (id in reveladas) {
      setReveladas(({ [id]: _quitada, ...resto }) => resto);
      return;
    }
    try {
      // El descifrado ocurre de a una nota, solo cuando el usuario la abre.
      const claro = await leerNota(nota);
      setReveladas((previas) => ({ ...previas, [id]: claro }));
    } catch {
      setError('No se pudo descifrar esa nota: puede haber sido alterada.');
    }
  };

  const borrar = async (nota: NotaGuardada) => {
    if (!window.confirm('¿Eliminar esta nota?')) return;
    await eliminarNota(await obtenerBd(), nota.id!);
    await cargar();
  };

  const visibles = notas.filter((n) => filtro === 'TODAS' || n.etiqueta === filtro);

  /* ------------------------------------------------------------ vistas */

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-petroleo/70 backdrop-blur-sm sm:items-center"
      onClick={alCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Notas privadas sobre ${nombre}`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-card bg-white p-5 shadow-xl sm:rounded-card"
      >
        <header className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-petroleo/5 text-xl">
            {avatar}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-bold text-petroleo">Notas sobre {nombre}</h2>
            <p className="text-[0.7rem] text-gris-texto">🔒 Cifradas · solo en este dispositivo</p>
          </div>
          <button
            onClick={alCerrar}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gris-texto transition hover:bg-gris-fondo"
          >
            ✕
          </button>
        </header>

        {error && (
          <p role="alert" className="mb-3 rounded-xl bg-coral/10 px-3 py-2 text-xs font-medium text-coral">
            {error}
          </p>
        )}

        {!boveda.soportada && (
          <p className="rounded-xl bg-gris-fondo px-4 py-3 text-xs leading-relaxed text-gris-texto">
            Las notas cifradas necesitan una conexión segura (HTTPS o localhost). Abre la app desde
            una de esas direcciones para usarlas.
          </p>
        )}

        {boveda.soportada && boveda.existe === null && (
          <p className="py-6 text-center text-xs text-gris-texto">Cargando…</p>
        )}

        {/* ---- 1. Primera vez: crear la contraseña ---- */}
        {boveda.soportada && boveda.existe === false && (
          <form onSubmit={crearBoveda} className="space-y-3">
            <p className="text-xs leading-relaxed text-gris-texto">
              Elige una contraseña para proteger tus notas. Con ella se genera la clave que las
              cifra; <strong>no se guarda en ningún lado</strong>.
            </p>
            <Campo
              etiqueta="Contraseña"
              valor={contrasena}
              alCambiar={setContrasena}
              autoComplete="new-password"
              ayuda={`Mínimo ${LARGO_MINIMO_CONTRASENA} caracteres`}
            />
            <Campo
              etiqueta="Repite la contraseña"
              valor={confirmacion}
              alCambiar={setConfirmacion}
              autoComplete="new-password"
            />
            <p className="rounded-xl bg-menta/10 px-3 py-2 text-[0.7rem] leading-relaxed text-petroleo">
              Si la olvidas, las notas no se pueden recuperar: nadie, ni siquiera RoomMatch, puede
              descifrarlas sin ella.
            </p>
            <Boton deshabilitado={trabajando || contrasena.length < LARGO_MINIMO_CONTRASENA}>
              {trabajando ? 'Creando…' : 'Crear bóveda'}
            </Boton>
          </form>
        )}

        {/* ---- 2. Existe pero está bloqueada: pedir la contraseña ---- */}
        {boveda.soportada && boveda.existe && !boveda.desbloqueada && (
          <form onSubmit={desbloquear} className="space-y-3">
            <p className="text-xs leading-relaxed text-gris-texto">
              {notas.length > 0
                ? `Tienes ${notas.length} ${notas.length === 1 ? 'nota' : 'notas'} sobre ${nombre}. `
                : ''}
              Escribe tu contraseña para leerlas o agregar otras.
            </p>
            <Campo
              etiqueta="Contraseña"
              valor={contrasena}
              alCambiar={setContrasena}
              autoComplete="current-password"
              autoFocus
            />
            <Boton deshabilitado={trabajando || contrasena.length === 0}>
              {trabajando ? 'Comprobando…' : 'Desbloquear'}
            </Boton>
            <button
              type="button"
              onClick={olvideLaContrasena}
              className="w-full text-center text-[0.7rem] font-medium text-gris-texto/70 underline"
            >
              Olvidé mi contraseña
            </button>
          </form>
        )}

        {/* ---- 3. Desbloqueada: leer y escribir ---- */}
        {boveda.soportada && boveda.existe && boveda.desbloqueada && (
          <>
            <form onSubmit={guardar} className="mb-5 space-y-2">
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={3}
                placeholder={`Algo que quieras recordar sobre ${nombre.split(' ')[0]}…`}
                className="w-full resize-none rounded-xl border border-petroleo/15 px-3 py-2.5 text-sm text-gris-texto"
              />
              <div className="flex items-center gap-2">
                <select
                  value={etiqueta}
                  onChange={(e) => setEtiqueta(e.target.value as Etiqueta)}
                  aria-label="Etiqueta de la nota"
                  className="flex-1 rounded-xl border border-petroleo/15 bg-white px-3 py-2.5 text-xs font-medium text-petroleo"
                >
                  {ETIQUETAS.map((clave) => (
                    <option key={clave} value={clave}>
                      {ETIQUETAS_NOTA[clave]}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={!texto.trim()}
                  className="rounded-full bg-petroleo px-5 py-2.5 text-xs font-semibold text-white transition disabled:opacity-40"
                >
                  Guardar
                </button>
              </div>
              <p className="text-[0.65rem] text-gris-texto/70">
                La etiqueta no se cifra (sirve para filtrar); el texto sí.
              </p>
            </form>

            {notas.length > 0 && (
              <div className="mb-3 flex gap-1.5 overflow-x-auto">
                {(['TODAS', ...ETIQUETAS] as Filtro[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFiltro(f)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[0.7rem] font-semibold transition ${
                      filtro === f ? 'bg-petroleo text-white' : 'bg-gris-fondo text-gris-texto'
                    }`}
                  >
                    {f === 'TODAS' ? 'Todas' : ETIQUETAS_NOTA[f]}
                  </button>
                ))}
              </div>
            )}

            {notas.length === 0 && (
              <p className="py-4 text-center text-xs text-gris-texto/70">Todavía no hay notas.</p>
            )}

            <ul className="space-y-2">
              {visibles.map((nota) => {
                const abierta = nota.id! in reveladas;
                return (
                  <li key={nota.id} className="rounded-xl bg-gris-fondo px-3.5 py-3">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-[0.7rem] font-semibold text-petroleo">
                        {ETIQUETAS_NOTA[nota.etiqueta]}
                      </span>
                      <span className="text-[0.65rem] text-gris-texto/60">
                        {new Date(nota.creadoEn).toLocaleString('es-CO', {
                          day: 'numeric',
                          month: 'short',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {abierta ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gris-texto">
                        {reveladas[nota.id!]}
                      </p>
                    ) : (
                      <p className="font-mono text-xs tracking-widest text-gris-texto/40">
                        ••••••••••••••••
                      </p>
                    )}

                    <div className="mt-2 flex gap-3">
                      <button
                        onClick={() => alternar(nota)}
                        className="text-[0.7rem] font-semibold text-petroleo underline"
                      >
                        {abierta ? 'Ocultar' : 'Ver nota'}
                      </button>
                      <button
                        onClick={() => borrar(nota)}
                        className="text-[0.7rem] font-semibold text-coral underline"
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <button
              onClick={boveda.bloquear}
              className="mt-5 w-full rounded-full border border-petroleo/20 py-2.5 text-xs font-semibold text-petroleo transition hover:bg-gris-fondo"
            >
              🔒 Bloquear notas
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ piezas */

function Campo({
  etiqueta,
  valor,
  alCambiar,
  autoComplete,
  ayuda,
  autoFocus,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  autoComplete: string;
  ayuda?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.7rem] font-semibold text-gris-texto">{etiqueta}</span>
      <input
        type="password"
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        className="w-full rounded-xl border border-petroleo/15 px-3 py-2.5 text-sm text-gris-texto"
      />
      {ayuda && <span className="mt-1 block text-[0.65rem] text-gris-texto/60">{ayuda}</span>}
    </label>
  );
}

function Boton({ children, deshabilitado }: { children: React.ReactNode; deshabilitado: boolean }) {
  return (
    <button
      type="submit"
      disabled={deshabilitado}
      className="w-full rounded-full bg-petroleo py-3 text-sm font-semibold text-white transition disabled:opacity-40"
    >
      {children}
    </button>
  );
}
