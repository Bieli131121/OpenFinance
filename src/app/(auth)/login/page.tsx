'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Etapa de MFA (só aparece se o usuário tiver 2FA ativado)
  const [needsMfa, setNeedsMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) { setError(signInError.message); return; }

    // Verifica se essa conta exige uma segunda etapa (2FA) para elevar o nível de sessão.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== aal.nextLevel) {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.find((f) => f.status === 'verified');
      if (totpFactor) {
        setFactorId(totpFactor.id);
        setNeedsMfa(true);
        return;
      }
    }

    window.location.href = '/dashboard';
  }

  async function handleVerifyMfa(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!factorId) return;

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) { setError(challengeError.message); return; }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId, challengeId: challenge.id, code: mfaCode,
    });
    if (verifyError) { setError('Código inválido. Tente novamente.'); return; }

    window.location.href = '/dashboard';
  }

  if (needsMfa) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <form onSubmit={handleVerifyMfa} className="w-full max-w-sm space-y-4 rounded-2xl border border-neutral-200 p-8 shadow-sm dark:border-neutral-800">
          <h1 className="text-xl font-semibold">Código de verificação</h1>
          <p className="text-sm text-neutral-500">Digite o código de 6 dígitos do seu app autenticador.</p>
          <input
            value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} maxLength={6} autoFocus
            placeholder="000000"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-center text-lg tracking-widest dark:border-neutral-700 dark:bg-neutral-900"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="w-full rounded-lg bg-brand-500 py-2 text-sm font-medium text-white hover:bg-brand-600">
            Verificar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-2xl border border-neutral-200 p-8 shadow-sm dark:border-neutral-800">
        <h1 className="text-xl font-semibold">Entrar no OpenFinance Hub</h1>
        <input
          type="email" required placeholder="E-mail" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <input
          type="password" required placeholder="Senha" value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" className="w-full rounded-lg bg-brand-500 py-2 text-sm font-medium text-white hover:bg-brand-600">
          Entrar
        </button>
      </form>
    </div>
  );
}
