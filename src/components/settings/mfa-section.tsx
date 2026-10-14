'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
interface Factor { id: string; friendly_name?: string; factor_type: string; status: string; }
export function MfaSection() {
  const supabase = createClient();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  async function loadFactors() { setLoading(true); const { data } = await supabase.auth.mfa.listFactors(); setFactors((data?.totp ?? []) as Factor[]); setLoading(false); }
  useEffect(() => { loadFactors(); }, []);
  async function startEnroll() {
    setError(null);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (error) { setError(error.message); return; }
    setFactorId(data.id); setQrCode(data.totp.qr_code); setSecret(data.totp.secret); setEnrolling(true);
  }
  async function confirmEnroll() {
    if (!factorId) return;
    setError(null);
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) { setError(challengeError.message); return; }
    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
    if (verifyError) { setError('Código inválido. Confira o app autenticador e tente de novo.'); return; }
    setEnrolling(false); setQrCode(null); setSecret(null); setCode('');
    await loadFactors();
  }
  async function removeFactor(id: string) { if (!confirm('Remover a autenticação em duas etapas?')) return; await supabase.auth.mfa.unenroll({ factorId: id }); await loadFactors(); }
  if (loading) return null;
  const hasVerifiedFactor = factors.some((f) => f.status === 'verified');
  return (
    <section className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
      <h2 className="mb-2 text-lg font-semibold">Autenticação em duas etapas (2FA)</h2>
      <p className="mb-3 text-sm text-neutral-500">Adiciona uma camada extra de segurança com um app autenticador.</p>
      {hasVerifiedFactor && !enrolling && (<div className="space-y-2">{factors.filter((f) => f.status === 'verified').map((f) => (<div key={f.id} className="flex items-center justify-between rounded-lg bg-emerald-50 p-3 text-sm dark:bg-emerald-950"><span className="text-emerald-700 dark:text-emerald-300">✓ 2FA ativado</span><button onClick={() => removeFactor(f.id)} className="text-xs text-red-500 hover:underline">Remover</button></div>))}</div>)}
      {!hasVerifiedFactor && !enrolling && (<button onClick={startEnroll} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Ativar 2FA</button>)}
      {enrolling && qrCode && (
        <div className="space-y-3">
          <p className="text-sm">1. Escaneie o QR code com seu app autenticador:</p>
          <div className="w-fit rounded-lg border border-neutral-200 p-2 dark:border-neutral-800" dangerouslySetInnerHTML={{ __html: qrCode }} />
          <p className="text-xs text-neutral-500">Ou digite manualmente: <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-900">{secret}</code></p>
          <p className="text-sm">2. Digite o código de 6 dígitos gerado pelo app:</p>
          <input value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} placeholder="000000" className="w-32 rounded-lg border border-neutral-300 px-3 py-2 text-center text-lg tracking-widest dark:border-neutral-700 dark:bg-neutral-900" />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button onClick={confirmEnroll} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Confirmar</button>
            <button onClick={() => { setEnrolling(false); setQrCode(null); }} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700">Cancelar</button>
          </div>
        </div>
      )}
    </section>
  );
}
