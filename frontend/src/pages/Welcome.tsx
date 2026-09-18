export function Welcome() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-petroleo shadow-card">
        <span className="text-3xl font-bold text-menta">R</span>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-petroleo">Rommatch</h1>
        <p className="text-sm text-gris-texto">
          Encuentra tu espacio. Encuentra tu match.
        </p>
      </div>

      <button
        type="button"
        className="rounded-full bg-petroleo px-8 py-3 text-sm font-semibold text-white shadow-card transition hover:opacity-90"
      >
        Comenzar
      </button>
    </main>
  );
}
