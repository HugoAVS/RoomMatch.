/** Banner que aparece cuando hay una versión nueva del Service Worker esperando. */
export function AvisoActualizacion({ aplicar }: { aplicar: () => void }) {
  return (
    <div className="fixed bottom-24 left-1/2 z-50 flex w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 items-center gap-3 rounded-card bg-petroleo p-4 text-white shadow-xl">
      <span className="text-xl">✨</span>
      <p className="flex-1 text-xs leading-relaxed">
        Hay una versión nueva de RoomMatch lista para usar.
      </p>
      <button
        type="button"
        onClick={aplicar}
        className="shrink-0 rounded-full bg-menta px-4 py-2 text-xs font-bold text-petroleo transition hover:opacity-90"
      >
        Actualizar
      </button>
    </div>
  );
}
