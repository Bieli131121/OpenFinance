'use client';

import { useState } from 'react';
import { seedDemoDataAction } from './actions';
import { usePrivacy } from '@/contexts/privacy-context';
import { MfaSection } from '@/components/settings/mfa-section';

export default function SettingsPage() {
  const { hidden, toggle } = usePrivacy();
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleDelete() {
    if (deleteConfirm !== 'EXCLUIR') return;
    setDeleting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        window.location.href = '/login';
      } else {
        setErrorMsg(body.error ?? 'Não foi possível excluir a conta. Tente novamente.');
      }
    } catch {
      setErrorMsg('Erro de conexão. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  }

  async function handleSeed() {
    setSeeding(true);
    await seedDemoDataAction();
    setSeeding(false);
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <MfaSection />

      <section className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="mb-2 text-lg font-semibold">Privacidade</h2>
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-500">Ocultar valores monetários na tela (útil em público)</p>
          <button
            onClick={toggle}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              hidden ? 'bg-brand-500 text-white' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-900'
            }`}
          >
            {hidden ? 'Ativado' : 'Desativado'}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="mb-2 text-lg font-semibold">Dados de demonstração</h2>
        <p className="mb-3 text-sm text-neutral-500">
          Popula sua conta com uma conta bancária, cartão, meta e investimento fictícios (marcados com [DEMO])
          para você explorar o app rapidamente.
        </p>
        <button
          onClick={handleSeed} disabled={seeding}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {seeding ? 'Criando...' : 'Usar dados de demonstração'}
        </button>
      </section>

      <section className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="mb-2 text-lg font-semibold">Privacidade e Segurança (LGPD)</h2>
        <p className="mb-3 text-sm text-neutral-500">
          Você pode baixar uma cópia de todos os seus dados a qualquer momento (limite: 5 por hora).
        </p>
        <a
          href="/api/account/export"
          className="inline-block rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          Exportar meus dados (JSON)
        </a>
      </section>

      <section className="rounded-2xl border border-red-200 p-5 dark:border-red-900">
        <h2 className="mb-2 text-lg font-semibold text-red-600">Excluir conta</h2>
        <p className="mb-3 text-sm text-neutral-500">
          Isso apaga permanentemente sua conta e todos os dados associados (contas, cartões, transações,
          metas, investimentos etc.). Essa ação não pode ser desfeita.
        </p>
        <div className="space-y-2">
          <input
            value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder='Digite "EXCLUIR" para confirmar'
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
          <button
            onClick={handleDelete} disabled={deleteConfirm !== 'EXCLUIR' || deleting}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-40"
          >
            {deleting ? 'Excluindo...' : 'Excluir minha conta permanentemente'}
          </button>
        </div>
      </section>
    </div>
  );
}
