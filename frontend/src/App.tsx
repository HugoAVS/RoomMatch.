import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { api } from './api/cliente';
import { AvisoActualizacion } from './components/AvisoActualizacion';
import { BarraNavegacion } from './components/BarraNavegacion';
import { IndicadorConexion } from './components/IndicadorConexion';
import { InstallPrompt } from './components/InstallPrompt';
import { Bienvenida } from './pages/Bienvenida';
import { Descubrir } from './pages/Descubrir';
import { Matches } from './pages/Matches';
import { Perfil } from './pages/Perfil';
import { Propiedades } from './pages/Propiedades';
import { registrarServiceWorker } from './pwa/registrarServiceWorker';
import type { Usuario } from './tipos';

export default function App() {
  return (
    <BrowserRouter>
      <Contenido />
    </BrowserRouter>
  );
}

function Contenido() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [error, setError] = useState(false);
  const [aplicarActualizacion, setAplicarActualizacion] = useState<(() => void) | null>(null);
  const ubicacion = useLocation();

  // El registro del Service Worker vive aquí para poder mostrar el aviso de
  // "nueva versión" dentro de la interfaz de React.
  useEffect(() => {
    registrarServiceWorker((aplicar) => setAplicarActualizacion(() => aplicar));
  }, []);

  // No hay login en este alcance: se trabaja con el usuario de demostración.
  useEffect(() => {
    api.usuarioDemo().then(setUsuario).catch(() => setError(true));
  }, []);

  const enBienvenida = ubicacion.pathname === '/';

  if (error && !usuario) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gris-fondo px-6 text-center">
        <span className="text-4xl">🔌</span>
        <p className="max-w-xs text-sm text-gris-texto">
          No pudimos conectar con el servidor. Verifica que el backend esté corriendo en el
          puerto 4000.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gris-fondo">
      <IndicadorConexion />

      <Routes>
        <Route path="/" element={<Bienvenida />} />
        <Route path="/descubrir" element={usuario ? <Descubrir usuario={usuario} /> : <Cargando />} />
        <Route path="/matches" element={usuario ? <Matches usuario={usuario} /> : <Cargando />} />
        <Route path="/propiedades" element={<Propiedades />} />
        <Route
          path="/perfil"
          element={usuario ? <Perfil usuario={usuario} alActualizar={setUsuario} /> : <Cargando />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!enBienvenida && <BarraNavegacion />}
      <InstallPrompt />
      {aplicarActualizacion && <AvisoActualizacion aplicar={aplicarActualizacion} />}
    </div>
  );
}

function Cargando() {
  return <p className="py-24 text-center text-sm text-gris-texto">Cargando…</p>;
}
