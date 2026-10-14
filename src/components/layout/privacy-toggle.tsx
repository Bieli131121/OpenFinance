'use client';
import { usePrivacy } from '@/contexts/privacy-context';
export function PrivacyToggle() {
  const { hidden, toggle } = usePrivacy();
  return (
    <button onClick={toggle} className="mb-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900">
      <span>{hidden ? '🙈' : '👁️'}</span><span>{hidden ? 'Mostrar valores' : 'Ocultar valores'}</span>
    </button>
  );
}
