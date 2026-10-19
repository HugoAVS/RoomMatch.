import { NavLink } from 'react-router-dom';

const SECCIONES = [
  { ruta: '/descubrir', icono: '🔍', etiqueta: 'Descubrir' },
  { ruta: '/matches', icono: '💚', etiqueta: 'Matches' },
  { ruta: '/propiedades', icono: '🏠', etiqueta: 'Arriendos' },
  { ruta: '/perfil', icono: '🙂', etiqueta: 'Perfil' },
];

/** Navegación inferior, al estilo de una app nativa. */
export function BarraNavegacion() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-petroleo/10 bg-white/95 backdrop-blur">
      <ul className="mx-auto flex max-w-lg">
        {SECCIONES.map(({ ruta, icono, etiqueta }) => (
          <li key={ruta} className="flex-1">
            <NavLink
              to={ruta}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2.5 text-[0.65rem] font-semibold transition ${
                  isActive ? 'text-petroleo' : 'text-gris-texto/50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`text-lg transition ${isActive ? 'scale-110' : ''}`}>{icono}</span>
                  {etiqueta}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
