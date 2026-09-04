export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Relatórios</h1>

      <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="mb-2 text-lg font-semibold">Exportar transações (CSV)</h2>
        <p className="mb-4 text-sm text-neutral-500">
          Baixa todas as suas transações em formato CSV, pronto para abrir no Excel ou Google Sheets.
        </p>
        <a
          href="/api/reports/transactions"
          className="inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Baixar CSV
        </a>
      </div>

      <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-sm text-neutral-500 dark:border-neutral-700">
        Exportação em PDF e Excel (.xlsx) com layout formatado, e relatórios por conta/cartão/patrimônio,
        ainda não foram construídos — hoje só a exportação CSV de transações está disponível.
      </div>
    </div>
  );
}
