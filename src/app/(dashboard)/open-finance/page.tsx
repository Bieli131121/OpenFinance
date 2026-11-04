import { createClient } from '@/lib/supabase/server';
import { getOpenFinanceProvider } from '@/lib/open-finance';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente', connected: 'Conectada', expired: 'Consentimento expirado', revoked: 'Revogada', error: 'Com erro',
};

export default async function OpenFinancePage() {
  const provider = getOpenFinanceProvider();
  const supabase = createClient();
  // Seleciona colunas explícitas: tokens (mesmo criptografados) nunca vão para a página.
  const { data: connections } = await supabase
    .from('open_finance_connections')
    .select('id, status, provider_key, consent_expires_at, last_synced_at, institution:institutions(name)')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Open Finance</h1>
        <p className="text-sm text-neutral-500">Conexões com instituições financeiras.</p>
      </div>

      {!provider && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Open Finance ainda não configurado. Defina <code>OPEN_FINANCE_PROVIDER</code> no ambiente do servidor para habilitar.
        </div>
      )}
      {provider?.key === 'mock' && (
        <div className="rounded-xl border border-sky-300 bg-sky-50 p-4 text-sm text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200">
          Modo demonstração (provider <code>mock</code>): os dados não vêm de um banco real.
        </div>
      )}
      {provider && provider.key !== 'mock' && (
        <div className="rounded-xl border border-neutral-200 p-4 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
          Provider ativo: <strong>{provider.key}</strong>. O fluxo de nova conexão (consentimento) ainda não foi implementado nesta tela.
        </div>
      )}

      <div className="space-y-2">
        {(connections ?? []).map((c: any) => (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <div>
              <p className="font-medium">{c.institution?.name ?? 'Instituição'}</p>
              <p className="text-xs text-neutral-500">
                {c.last_synced_at ? `Última sincronização: ${new Date(c.last_synced_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}` : 'Nunca sincronizada'}
              </p>
            </div>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs dark:bg-neutral-900">{STATUS_LABEL[c.status] ?? c.status}</span>
          </div>
        ))}
        {(connections ?? []).length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500 dark:border-neutral-700">
            Nenhuma instituição conectada.
          </div>
        )}
      </div>
    </div>
  );
}
