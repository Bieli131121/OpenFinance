import { getOpenFinanceProvider } from '@/lib/open-finance';
export default async function OpenFinancePage() {
  const provider = getOpenFinanceProvider();
  const institutions = provider ? await provider.listInstitutions() : [];
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Open Finance</h1><p className="text-sm text-neutral-500">Conecte suas instituições financeiras</p></div>
      {!provider ? (<div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">Open Finance ainda não configurado. Defina <code>OPEN_FINANCE_PROVIDER</code> no .env (use <code>mock</code> para o modo demo) para conectar suas instituições.</div>) : (
        <>
          <div className="rounded-xl border border-blue-300 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">Provider ativo: <strong>{provider.key}</strong>{provider.key === 'mock' && ' — modo demonstração, nenhuma conexão bancária real.'}</div>
          <div><h2 className="mb-3 text-lg font-semibold">Instituições disponíveis</h2><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{institutions.map((inst) => (<div key={inst.externalId} className="flex items-center justify-between rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"><span className="font-medium">{inst.name}</span><button className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600">+ Conectar</button></div>))}</div></div>
        </>
      )}
    </div>
  );
}
