import type { Insight } from '@/lib/supabase/queries/insights';
export function InsightsPanel({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;
  return (
    <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
      <h2 className="mb-3 text-sm font-medium text-neutral-500">INSIGHTS</h2>
      <ul className="space-y-2">
        {insights.map((insight, idx) => (<li key={idx} className={`rounded-lg p-3 text-sm ${insight.tone === 'negative' ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' : insight.tone === 'positive' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-neutral-50 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300'}`}>{insight.message}</li>))}
      </ul>
    </div>
  );
}
