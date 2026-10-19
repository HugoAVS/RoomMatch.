import { useCallback, useEffect, useState } from 'react';
import { api, SinConexionError } from '../api/cliente';
import { obtenerBd } from '../almacenamiento/boveda';
import { contarNotasPorMatch } from '../almacenamiento/notas';
import { NotasPrivadas } from '../components/NotasPrivadas';
import type { Match, Usuario } from '../tipos';
import { formatearPrecio, ETIQUETAS } from '../tipos';

export function Matches({ usuario }: { usuario: Usuario }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sinConexion, setSinConexion] = useState(false);
  const [notasDe, setNotasDe] = useState<Match | null>(null);
  const [conteoNotas, setConteoNotas] = useState<Record<string, number>>({});

  // Cuántas notas tiene cada match. Se lee del índice, sin descifrar nada.
  const cargarConteos = useCallback(async () => {
    try {
      setConteoNotas(await contarNotasPorMatch(await obtenerBd()));
    } catch {
      setConteoNotas({}); // IndexedDB no disponible: la pantalla funciona igual
    }
  }, []);

  useEffect(() => {
    cargarConteos();
  }, [cargarConteos]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setMatches(await api.matches(usuario.id));
      setSinConexion(false);
    } catch (e) {
      setSinConexion(e instanceof SinConexionError);
    } finally {
      setCargando(false);
    }
  }, [usuario.id]);

  useEffect(() => {
    cargar();

    // Si el Service Worker sincroniza swipes pendientes, puede haber matches
    // nuevos: se recarga la lista sin que el usuario haga nada.
    const alMensaje = (evento: MessageEvent) => {
      if (evento.data?.tipo === 'SWIPES_SINCRONIZADOS') cargar();
    };
    navigator.serviceWorker?.addEventListener('message', alMensaje);
    return () => navigator.serviceWorker?.removeEventListener('message', alMensaje);
  }, [cargar]);

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-28 pt-4">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-petroleo">Tus matches</h1>
        <p className="text-xs text-gris-texto">Personas a las que también les interesas</p>
      </header>

      {cargando && <p className="py-12 text-center text-sm text-gris-texto">Cargando…</p>}

      {!cargando && sinConexion && (
        <Vacio icono="📡" texto="Sin conexión y sin matches guardados todavía." />
      )}

      {!cargando && !sinConexion && matches.length === 0 && (
        <Vacio
          icono="💚"
          texto="Todavía no tienes matches. Ve a Descubrir y acepta a quien te interese."
        />
      )}

      <ul className="space-y-3">
        {matches.map((match) => (
          <li
            key={match.id}
            className="rounded-card bg-white p-4 shadow-card ring-1 ring-petroleo/5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-petroleo/5 text-2xl">
                {match.compañero.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-bold text-petroleo">
                  {match.compañero.fullName}, {match.compañero.edad}
                </h2>
                <p className="truncate text-xs text-gris-texto">{match.compañero.ocupacion}</p>
                <p className="mt-1 text-xs text-gris-texto/70">
                  {ETIQUETAS.horario[match.compañero.horario]} ·{' '}
                  {formatearPrecio(match.compañero.presupuesto)}
                </p>
              </div>
              <div className="shrink-0 rounded-full bg-menta/15 px-2.5 py-1 text-xs font-bold text-petroleo">
                {match.compatibilidad.porcentaje}%
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <a
                href={`mailto:${match.compañero.email}`}
                className="flex-1 rounded-full bg-petroleo py-2.5 text-center text-xs font-semibold text-white transition hover:opacity-90"
              >
                Escribir a {match.compañero.fullName.split(' ')[0]}
              </a>
              <button
                type="button"
                onClick={() => setNotasDe(match)}
                className="rounded-full px-4 py-2.5 text-xs font-semibold text-petroleo ring-1 ring-petroleo/20 transition hover:bg-gris-fondo"
              >
                🔒 Notas{conteoNotas[match.compañero.id] ? ` (${conteoNotas[match.compañero.id]})` : ''}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {notasDe && (
        <NotasPrivadas
          matchId={notasDe.compañero.id}
          nombre={notasDe.compañero.fullName}
          avatar={notasDe.compañero.avatar}
          alCerrar={() => {
            setNotasDe(null);
            cargarConteos(); // el número del botón puede haber cambiado
          }}
        />
      )}
    </div>
  );
}

function Vacio({ icono, texto }: { icono: string; texto: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <span className="text-4xl">{icono}</span>
      <p className="max-w-xs text-sm text-gris-texto">{texto}</p>
    </div>
  );
}
