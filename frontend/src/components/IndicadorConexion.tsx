import { useConexion } from '../hooks/useConexion';

/**
 * Barra superior que aparece solo cuando hace falta: sin conexión, o con
 * swipes esperando a ser enviados. En condiciones normales no estorba.
 */
export function IndicadorConexion() {
  const { enLinea, pendientes } = useConexion();

  if (enLinea && pendientes === 0) return null;

  const sinConexion = !enLinea;

  return (
    <div
      role="status"
      className={`sticky top-0 z-30 flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold ${
        sinConexion ? 'bg-coral text-white' : 'bg-menta text-petroleo'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${sinConexion ? 'bg-white' : 'bg-petroleo'} animate-pulse`} />
      {sinConexion ? (
        <span>
          Sin conexión · seguimos funcionando
          {pendientes > 0 && ` · ${pendientes} por enviar`}
        </span>
      ) : (
        <span>Enviando {pendientes} decisión{pendientes === 1 ? '' : 'es'} pendiente{pendientes === 1 ? '' : 's'}…</span>
      )}
    </div>
  );
}
