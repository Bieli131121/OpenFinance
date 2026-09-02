type Card = { label: string; value: string; tone?: 'positive' | 'negative' | 'neutral' };

export function SummaryCards({ cards }: { cards: Card[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-xs text-neutral-500">{c.label}</p>
          <p
            className={
              'mt-1 text-xl font-semibold ' +
              (c.tone === 'positive' ? 'text-emerald-600' : c.tone === 'negative' ? 'text-red-500' : '')
            }
          >
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}
