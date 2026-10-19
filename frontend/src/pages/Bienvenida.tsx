import { useNavigate } from 'react-router-dom';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

const VENTAJAS = [
  { icono: '🧩', texto: 'Compatibilidad calculada con tus hábitos reales de convivencia' },
  { icono: '🏠', texto: 'Arriendos verificados cerca de tu universidad o trabajo' },
  { icono: '📴', texto: 'Funciona sin internet: tus decisiones se guardan y se envían solas' },
];

export function Bienvenida() {
  const navegar = useNavigate();
  const { sePuedeInstalar, instalar } = useInstallPrompt();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-8 px-6 py-12">
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-petroleo shadow-card">
          <span className="text-3xl">🏡</span>
        </div>
        <h1 className="text-3xl font-bold text-petroleo">RoomMatch</h1>
        <p className="mt-2 text-sm text-gris-texto">Encuentra tu espacio. Encuentra tu match.</p>
      </div>

      <ul className="space-y-3">
        {VENTAJAS.map(({ icono, texto }) => (
          <li
            key={texto}
            className="flex items-start gap-3 rounded-card bg-white px-4 py-3 shadow-card ring-1 ring-petroleo/5"
          >
            <span className="text-xl">{icono}</span>
            <p className="text-xs leading-relaxed text-gris-texto">{texto}</p>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => navegar('/descubrir')}
          className="w-full rounded-full bg-petroleo py-3.5 text-sm font-semibold text-white shadow-card transition hover:opacity-90"
        >
          Comenzar
        </button>

        {sePuedeInstalar && (
          <button
            type="button"
            onClick={instalar}
            className="w-full rounded-full bg-menta py-3.5 text-sm font-semibold text-petroleo transition hover:opacity-90"
          >
            Instalar la aplicación
          </button>
        )}
      </div>
    </main>
  );
}
