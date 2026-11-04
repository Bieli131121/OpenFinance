'use client';

import { useEffect } from 'react';

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-bold">Algo deu errado</h1>
      <p className="text-sm text-neutral-500">Não foi possível carregar esta página. Tente novamente.</p>
      {error.digest && <p className="text-xs text-neutral-400">Código: {error.digest}</p>}
      <button onClick={reset} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Tentar de novo</button>
    </div>
  );
}
