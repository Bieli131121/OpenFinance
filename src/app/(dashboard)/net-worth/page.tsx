import { getNetWorthBreakdown, getAssets, getLiabilities } from '@/lib/supabase/queries/net-worth';
import { addAssetAction, addLiabilityAction, deleteAssetAction, deleteLiabilityAction } from './actions';
import { DeleteButton } from '@/components/ui/delete-button';

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default async function NetWorthPage() {
  const [{ totalAssets, totalLiabilities, netWorth }, assets, liabilities] = await Promise.all([
    getNetWorthBreakdown(), getAssets(), getLiabilities(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-neutral-500">Patrimônio líquido</p>
        <h1 className="text-3xl font-bold">{formatBRL(netWorth)}</h1>
        <p className="mt-1 text-sm text-neutral-500">Ativos − Passivos</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
          <h2 className="mb-3 text-sm font-medium text-emerald-600">ATIVOS — {formatBRL(totalAssets)}</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-neutral-600 dark:text-neutral-400">Contas + Investimentos</span></div>
            {assets.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span className="text-neutral-600 dark:text-neutral-400">{a.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatBRL(Number(a.value))}</span>
                  <DeleteButton action={deleteAssetAction} id={a.id} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
          <h2 className="mb-3 text-sm font-medium text-red-500">PASSIVOS — {formatBRL(totalLiabilities)}</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-neutral-600 dark:text-neutral-400">Dívidas + Financiamentos</span></div>
            {liabilities.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-sm">
                <span className="text-neutral-600 dark:text-neutral-400">{l.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatBRL(Number(l.value))}</span>
                  <DeleteButton action={deleteLiabilityAction} id={l.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
          <h2 className="mb-4 text-lg font-semibold">Adicionar bem (ativo)</h2>
          <form action={addAssetAction} className="space-y-3">
            <input name="name" required placeholder="Nome (ex: Carro, Apartamento)" className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900" />
            <select name="kind" className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
              <option value="vehicle">Veículo</option><option value="real_estate">Imóvel</option><option value="other">Outro bem</option>
            </select>
            <input name="value" type="number" step="0.01" required placeholder="Valor estimado" className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900" />
            <button type="submit" className="w-full rounded-lg bg-brand-500 py-2 text-sm font-medium text-white hover:bg-brand-600">Adicionar</button>
          </form>
        </div>
        <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
          <h2 className="mb-4 text-lg font-semibold">Adicionar outra dívida (passivo)</h2>
          <form action={addLiabilityAction} className="space-y-3">
            <input name="name" required placeholder="Nome (ex: Empréstimo pessoal)" className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900" />
            <input name="kind" placeholder="Tipo (opcional)" className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900" />
            <input name="value" type="number" step="0.01" required placeholder="Valor" className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900" />
            <button type="submit" className="w-full rounded-lg bg-brand-500 py-2 text-sm font-medium text-white hover:bg-brand-600">Adicionar</button>
          </form>
        </div>
      </div>
    </div>
  );
}
