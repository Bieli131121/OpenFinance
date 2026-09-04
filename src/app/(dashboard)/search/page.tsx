import Link from 'next/link';
import { globalSearch } from '@/lib/supabase/queries/search';

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const query = searchParams.q ?? '';
  const results = query ? await globalSearch(query) : null;
  const totalResults = results ? results.transactions.length + results.accounts.length + results.cards.length + results.goals.length : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Busca</h1>

      <form method="GET" className="flex gap-2">
        <input
          name="q" defaultValue={query} autoFocus placeholder="Pesquisar transações, contas, cartões, metas..."
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button type="submit" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Buscar</button>
      </form>

      {results && totalResults === 0 && (
        <p className="text-sm text-neutral-500">Nenhum resultado para "{query}".</p>
      )}

      {results && results.transactions.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-neutral-500">TRANSAÇÕES</h2>
          <div className="space-y-1">
            {results.transactions.map((t) => (
              <Link key={t.id} href="/transactions" className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 text-sm hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
                <span>{t.description_raw}</span>
                <span className="text-xs text-neutral-500">{new Date(t.occurred_at).toLocaleDateString('pt-BR')} — {formatBRL(Number(t.amount))}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {results && results.accounts.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-neutral-500">CONTAS</h2>
          <div className="space-y-1">
            {results.accounts.map((a) => (
              <Link key={a.id} href="/accounts" className="block rounded-lg border border-neutral-200 p-3 text-sm hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">{a.name}</Link>
            ))}
          </div>
        </div>
      )}

      {results && results.cards.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-neutral-500">CARTÕES</h2>
          <div className="space-y-1">
            {results.cards.map((c) => (
              <Link key={c.id} href="/cards" className="block rounded-lg border border-neutral-200 p-3 text-sm hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">{c.name}</Link>
            ))}
          </div>
        </div>
      )}

      {results && results.goals.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-neutral-500">METAS</h2>
          <div className="space-y-1">
            {results.goals.map((g) => (
              <Link key={g.id} href="/goals" className="block rounded-lg border border-neutral-200 p-3 text-sm hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">{g.name}</Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
