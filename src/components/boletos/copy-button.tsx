'use client';

import { useState } from 'react';

/** Copia a linha digitável para colar no app do banco. */
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copie o código:', text);
    }
  }
  return (
    <button type="button" onClick={copy} className="text-xs text-brand-600 hover:underline">
      {copied ? '✓ Copiado' : 'Copiar código'}
    </button>
  );
}
