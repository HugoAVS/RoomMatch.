import { useInstallPrompt } from '../hooks/useInstallPrompt';

export function InstallPrompt() {
  const { canInstall, promptInstall } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <button
      type="button"
      onClick={promptInstall}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-menta px-6 py-3 text-sm font-semibold text-petroleo shadow-card"
    >
      Instalar Rommatch
    </button>
  );
}
