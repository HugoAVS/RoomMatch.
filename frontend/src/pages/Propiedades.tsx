import { useEffect, useState } from 'react';
import { api, SinConexionError } from '../api/cliente';
import type { Propiedad } from '../tipos';
import { formatearPrecio } from '../tipos';

const PRECIOS = [
  { etiqueta: 'Cualquiera', valor: 0 },
  { etiqueta: 'Hasta $500k', valor: 500000 },
  { etiqueta: 'Hasta $800k', valor: 800000 },
  { etiqueta: 'Hasta $1.2M', valor: 1200000 },
];

export function Propiedades() {
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [ciudades, setCiudades] = useState<string[]>([]);
  const [ciudad, setCiudad] = useState('todas');
  const [maxPrecio, setMaxPrecio] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [sinConexion, setSinConexion] = useState(false);

  useEffect(() => {
    api.ciudades().then(setCiudades).catch(() => setCiudades([]));
  }, []);

  useEffect(() => {
    let vigente = true;
    setCargando(true);

    api
      .propiedades({ ciudad, maxPrecio: maxPrecio || undefined })
      .then((datos) => {
        if (!vigente) return;
        setPropiedades(datos);
        setSinConexion(false);
      })
      .catch((e) => {
        if (!vigente) return;
        setSinConexion(e instanceof SinConexionError);
        setPropiedades([]);
      })
      .finally(() => vigente && setCargando(false));

    // Evita que una respuesta lenta de un filtro anterior pise a la actual.
    return () => {
      vigente = false;
    };
  }, [ciudad, maxPrecio]);

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-28 pt-4">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-petroleo">Arriendos</h1>
        <p className="text-xs text-gris-texto">Habitaciones y apartamentos disponibles</p>
      </header>

      <div className="mb-4 flex gap-2">
        <select
          value={ciudad}
          onChange={(e) => setCiudad(e.target.value)}
          className="flex-1 rounded-xl border border-petroleo/15 bg-white px-3 py-2.5 text-xs font-medium text-petroleo"
        >
          <option value="todas">Todas las ciudades</option>
          {ciudades.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={maxPrecio}
          onChange={(e) => setMaxPrecio(Number(e.target.value))}
          className="flex-1 rounded-xl border border-petroleo/15 bg-white px-3 py-2.5 text-xs font-medium text-petroleo"
        >
          {PRECIOS.map((p) => (
            <option key={p.valor} value={p.valor}>{p.etiqueta}</option>
          ))}
        </select>
      </div>

      {cargando && <p className="py-12 text-center text-sm text-gris-texto">Cargando…</p>}

      {!cargando && sinConexion && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="text-4xl">📡</span>
          <p className="max-w-xs text-sm text-gris-texto">
            Sin conexión y sin arriendos guardados para este filtro.
          </p>
        </div>
      )}

      {!cargando && !sinConexion && propiedades.length === 0 && (
        <p className="py-16 text-center text-sm text-gris-texto">
          No hay arriendos con esos filtros.
        </p>
      )}

      <ul className="space-y-3">
        {propiedades.map((p) => (
          <li key={p.id} className="overflow-hidden rounded-card bg-white shadow-card ring-1 ring-petroleo/5">
            <div className="flex items-center gap-3 bg-petroleo/5 px-4 py-3">
              <span className="text-2xl">{p.emoji}</span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-bold text-petroleo">{p.title}</h2>
                <p className="truncate text-xs text-gris-texto">
                  📍 {p.barrio}, {p.city}
                </p>
              </div>
            </div>

            <div className="space-y-3 px-4 py-3">
              <p className="text-xs leading-relaxed text-gris-texto">{p.description}</p>

              <div className="flex flex-wrap gap-1.5">
                <Dato>{p.habitaciones} hab.</Dato>
                <Dato>{p.banos} baño{p.banos > 1 ? 's' : ''}</Dato>
                {p.amoblado && <Dato>Amoblado</Dato>}
                {p.servicios.slice(0, 2).map((s) => (
                  <Dato key={s}>{s}</Dato>
                ))}
              </div>

              <div className="flex items-end justify-between border-t border-petroleo/5 pt-3">
                <div>
                  <p className="text-lg font-bold text-petroleo">{formatearPrecio(p.price)}</p>
                  <p className="text-[0.65rem] text-gris-texto/70">por mes</p>
                </div>
                <p className="text-right text-[0.7rem] text-gris-texto">
                  {p.landlord.avatar} {p.landlord.fullName}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Dato({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-gris-fondo px-2.5 py-1 text-[0.7rem] font-medium text-gris-texto">
      {children}
    </span>
  );
}
