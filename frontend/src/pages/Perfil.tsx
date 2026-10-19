import { useEffect, useState } from 'react';
import { api } from '../api/cliente';
import { obtenerBd } from '../almacenamiento/boveda';
import { contarNotas, contarPorEtiqueta } from '../almacenamiento/notas';
import { CapturaFoto } from '../components/CapturaFoto';
import { useBoveda } from '../hooks/useBoveda';
import { useFotoPerfil } from '../hooks/useFotoPerfil';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useConexion } from '../hooks/useConexion';
import type { Horario, NivelOrden, Sociabilidad, Usuario } from '../tipos';
import { ETIQUETAS, formatearPrecio } from '../tipos';

interface Props {
  usuario: Usuario;
  alActualizar: (usuario: Usuario) => void;
}

export function Perfil({ usuario, alActualizar }: Props) {
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const { instalada, sePuedeInstalar, instalar } = useInstallPrompt();
  const { enLinea, pendientes } = useConexion();
  const boveda = useBoveda();
  const foto = useFotoPerfil();
  const [tomandoFoto, setTomandoFoto] = useState(false);
  const [notas, setNotas] = useState<{ total: number; alertas: number } | null>(null);

  // Estos dos números salen de IndexedDB sin descifrar nada: el total con
  // count() y las alertas con el índice por etiqueta, que no está cifrada.
  useEffect(() => {
    (async () => {
      try {
        const db = await obtenerBd();
        setNotas({ total: await contarNotas(db), alertas: await contarPorEtiqueta(db, 'ALERTA') });
      } catch {
        setNotas(null);
      }
    })();
  }, [boveda.existe]);

  const cambiar = async (cambios: Partial<Usuario>) => {
    const optimista = { ...usuario, ...cambios };
    alActualizar(optimista); // la interfaz responde de una

    setGuardando(true);
    setMensaje(null);
    try {
      alActualizar(await api.actualizarPerfil(usuario.id, cambios));
      setMensaje('Cambios guardados');
    } catch {
      setMensaje('No se pudo guardar. Revisa tu conexión.');
      alActualizar(usuario); // se revierte si falló
    } finally {
      setGuardando(false);
      window.setTimeout(() => setMensaje(null), 2500);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-28 pt-4">
      <header className="mb-4 flex items-center gap-4">
        <button
          type="button"
          onClick={() => setTomandoFoto(true)}
          aria-label="Cambiar foto de perfil"
          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-petroleo text-3xl transition hover:opacity-90"
        >
          {foto.url ? (
            <img src={foto.url} alt="Tu foto de perfil" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center">{usuario.avatar}</span>
          )}
          <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-tl-lg bg-menta text-[0.6rem]">
            📷
          </span>
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-petroleo">{usuario.fullName}</h1>
          <p className="truncate text-xs text-gris-texto">{usuario.ocupacion}</p>
          <p className="text-xs text-gris-texto/70">📍 {usuario.ciudad}</p>
        </div>
      </header>

      <Seccion titulo="Foto de perfil">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTomandoFoto(true)}
            className="flex-1 rounded-full bg-petroleo px-4 py-2.5 text-xs font-semibold text-white transition hover:opacity-90"
          >
            📷 {foto.url ? 'Cambiar con la cámara' : 'Tomar foto con la cámara'}
          </button>
          {foto.url && (
            <button
              type="button"
              onClick={foto.quitar}
              className="rounded-full px-4 py-2.5 text-xs font-semibold text-coral ring-1 ring-coral/30 transition hover:bg-coral/5"
            >
              Quitar
            </button>
          )}
        </div>
        <p className="mt-2 text-[0.7rem] leading-relaxed text-gris-texto/70">
          {foto.tomadaEn
            ? `Guardada en este dispositivo (${new Date(foto.tomadaEn).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}). No se envía al servidor.`
            : 'Sin foto: se muestra tu emoji. La foto se guardaría solo en este dispositivo.'}
        </p>
      </Seccion>

      <Seccion titulo="Sobre mí">
        <textarea
          defaultValue={usuario.bio}
          onBlur={(e) => e.target.value !== usuario.bio && cambiar({ bio: e.target.value })}
          rows={3}
          className="w-full resize-none rounded-xl border border-petroleo/15 bg-white px-3 py-2.5 text-sm text-gris-texto"
        />
      </Seccion>

      <Seccion titulo={`Presupuesto · ${formatearPrecio(usuario.presupuesto)}`}>
        <input
          type="range"
          min={300000}
          max={1500000}
          step={50000}
          value={usuario.presupuesto}
          onChange={(e) => alActualizar({ ...usuario, presupuesto: Number(e.target.value) })}
          onMouseUp={(e) => cambiar({ presupuesto: Number((e.target as HTMLInputElement).value) })}
          onTouchEnd={(e) => cambiar({ presupuesto: Number((e.target as HTMLInputElement).value) })}
          className="w-full accent-petroleo"
        />
      </Seccion>

      <Seccion titulo="Horario">
        <Opciones
          valor={usuario.horario}
          opciones={Object.entries(ETIQUETAS.horario) as [Horario, string][]}
          alElegir={(horario) => cambiar({ horario })}
        />
      </Seccion>

      <Seccion titulo="Nivel de orden">
        <Opciones
          valor={usuario.orden}
          opciones={Object.entries(ETIQUETAS.orden) as [NivelOrden, string][]}
          alElegir={(orden) => cambiar({ orden })}
        />
      </Seccion>

      <Seccion titulo="Vida social">
        <Opciones
          valor={usuario.sociabilidad}
          opciones={Object.entries(ETIQUETAS.sociabilidad) as [Sociabilidad, string][]}
          alElegir={(sociabilidad) => cambiar({ sociabilidad })}
        />
      </Seccion>

      <Seccion titulo="Preferencias">
        <div className="flex gap-2">
          <Interruptor
            activo={usuario.mascotas}
            etiqueta="🐾 Acepto mascotas"
            alCambiar={(mascotas) => cambiar({ mascotas })}
          />
          <Interruptor
            activo={usuario.fumador}
            etiqueta="🚬 Fumo"
            alCambiar={(fumador) => cambiar({ fumador })}
          />
        </div>
      </Seccion>

      {boveda.soportada && (
        <Seccion titulo="Notas privadas">
          <dl className="space-y-2 rounded-xl bg-white px-4 py-3 text-xs shadow-card ring-1 ring-petroleo/5">
            <Fila
              termino="Bóveda"
              valor={
                boveda.existe === null
                  ? '…'
                  : !boveda.existe
                    ? 'Sin crear'
                    : boveda.desbloqueada
                      ? '🔓 Desbloqueada'
                      : '🔒 Bloqueada'
              }
            />
            <Fila termino="Notas guardadas" valor={notas ? String(notas.total) : '—'} />
            <Fila termino="Marcadas como alerta" valor={notas ? String(notas.alertas) : '—'} />
          </dl>
          <p className="mt-2 text-[0.7rem] leading-relaxed text-gris-texto/70">
            Cifradas con AES-256 en este dispositivo. Se abren desde la pantalla de Matches.
          </p>
          {boveda.desbloqueada && (
            <button
              onClick={boveda.bloquear}
              className="mt-2 w-full rounded-full border border-petroleo/20 py-2.5 text-xs font-semibold text-petroleo"
            >
              Bloquear ahora
            </button>
          )}
        </Seccion>
      )}

      {/* Estado de la PWA: útil para la demostración y para el usuario */}
      <Seccion titulo="Estado de la aplicación">
        <dl className="space-y-2 rounded-xl bg-white px-4 py-3 text-xs shadow-card ring-1 ring-petroleo/5">
          <Fila termino="Conexión" valor={enLinea ? 'En línea' : 'Sin conexión'} />
          <Fila termino="Decisiones por enviar" valor={String(pendientes)} />
          <Fila termino="Instalada" valor={instalada ? 'Sí' : 'No'} />
        </dl>

        {sePuedeInstalar && (
          <button
            onClick={instalar}
            className="mt-2 w-full rounded-full bg-menta py-2.5 text-xs font-bold text-petroleo"
          >
            Instalar RoomMatch en este dispositivo
          </button>
        )}
      </Seccion>

      {(guardando || mensaje) && (
        <p className="py-2 text-center text-xs font-semibold text-gris-texto">
          {guardando ? 'Guardando…' : mensaje}
        </p>
      )}

      {tomandoFoto && (
        <CapturaFoto alGuardar={foto.guardar} alCerrar={() => setTomandoFoto(false)} />
      )}
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="mb-2 text-[0.7rem] font-bold uppercase tracking-wider text-gris-texto/60">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Opciones<T extends string>({
  valor,
  opciones,
  alElegir,
}: {
  valor: T;
  opciones: [T, string][];
  alElegir: (valor: T) => void;
}) {
  return (
    <div className="flex gap-2">
      {opciones.map(([clave, etiqueta]) => (
        <button
          key={clave}
          type="button"
          onClick={() => clave !== valor && alElegir(clave)}
          className={`flex-1 rounded-xl px-2 py-2.5 text-xs font-semibold transition ${
            clave === valor
              ? 'bg-petroleo text-white'
              : 'bg-white text-gris-texto ring-1 ring-petroleo/10'
          }`}
        >
          {etiqueta}
        </button>
      ))}
    </div>
  );
}

function Interruptor({
  activo,
  etiqueta,
  alCambiar,
}: {
  activo: boolean;
  etiqueta: string;
  alCambiar: (valor: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => alCambiar(!activo)}
      aria-pressed={activo}
      className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
        activo ? 'bg-petroleo text-white' : 'bg-white text-gris-texto ring-1 ring-petroleo/10'
      }`}
    >
      {etiqueta}
    </button>
  );
}

function Fila({ termino, valor }: { termino: string; valor: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gris-texto">{termino}</dt>
      <dd className="font-semibold text-petroleo">{valor}</dd>
    </div>
  );
}
