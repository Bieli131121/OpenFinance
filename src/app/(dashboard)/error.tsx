'use client';

import { useEffect } from 'react';

/** Erro dentro do dashboard: o menu continua na tela e só o conteúdo mostra o aviso. */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-red-200 p-6 text-center dark:border-red-900">
      <h1 className="text-lg font-semibold">Não foi possível carregar esta página</h1>
      <p className="text-sm text-neutral-500">Pode ser uma falha temporária. Se continuar, avise o suporte com o código abaixo.</p>
      {error.digest && <p className="text-xs text-neutral-400">Código: {error.digest}</p>}
      <button onClick={reset} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Tentar de novo</button>
    </div>
  );
}
