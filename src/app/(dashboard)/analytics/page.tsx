import { getCashFlowForecast } from '@/lib/supabase/queries/cash-flow';
function formatBRL(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
export default async function AnalyticsPage() {
  const forecast = await getCashFlowForecast(6);
  return (
    <div className="space-y-8">
      <div><h1 className="text-2xl font-bold">Fluxo de Caixa Futuro</h1><p className="text-sm text-neutral-500">Previsão dos próximos 6 meses considerando recorrentes ativas, dívidas, financiamentos e parcelas de cartão.</p></div>
      <div className="space-y-3">
        {forecast.map((month, idx) => (<div key={idx} className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800"><div className="flex items-center justify-between"><p className="font-medium capitalize">{month.label}</p><p className={`text-lg font-semibold ${month.endBalance >= 0 ? '' : 'text-red-500'}`}>{formatBRL(month.endBalance)}</p></div><div className="mt-2 grid grid-cols-3 gap-3 text-xs text-neutral-500"><span>Saldo inicial: {formatBRL(month.startBalance)}</span><span className="text-emerald-600">Receitas: +{formatBRL(month.income)}</span><span className="text-red-500">Despesas: -{formatBRL(month.expenses)}</span></div></div>))}
      </div>
      <p className="text-xs text-neutral-400">Previsão simplificada — não considera gastos variáveis do dia a dia.</p>
    </div>
  );
}
