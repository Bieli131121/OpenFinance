'use client';

import { useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { saveBillAction, type SaveBillState } from '@/app/(dashboard)/boletos/actions';
import type { BoletoScanResult } from '@/lib/boleto/types';

interface Category { id: string; name: string; icon: string | null }

const inputClass = 'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900';
const MAX_SIDE = 1800;

/** Reduz a foto (lado maior 1800px, JPEG): upload rápido e normaliza HEIC/rotação do celular. */
async function compressImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.88));
    if (blob) return blob;
  } catch { /* cai para o arquivo original */ }
  return file;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
      {pending ? 'Salvando…' : 'Salvar boleto'}
    </button>
  );
}

function confidenceLabel(c: number) {
  if (c >= 0.9) return { text: 'Confiança alta', cls: 'text-emerald-600' };
  if (c >= 0.7) return { text: 'Confiança média — confira os campos', cls: 'text-amber-600' };
  return { text: 'Confiança baixa — revise tudo', cls: 'text-red-500' };
}

export function BoletoScanner({ categories }: { categories: Category[] }) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BoletoScanResult | null>(null);
  const [code, setCode] = useState('');
  const [formKey, setFormKey] = useState(0);

  const [state, formAction] = useFormState<SaveBillState, FormData>(saveBillAction, { ok: false });

  // Depois de salvar com sucesso, limpa o formulário.
  const [handledOk, setHandledOk] = useState(false);
  if (state.ok && result && !handledOk) {
    setHandledOk(true);
    setResult(null); setPreview(null); setCode('');
  }

  async function scan(init: RequestInit) {
    setBusy(true); setError(null); setResult(null); setHandledOk(false);
    try {
      const res = await fetch('/api/boletos/scan', { method: 'POST', ...init });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error ?? 'Não foi possível ler o boleto.'); return; }
      setResult(json.result as BoletoScanResult);
      setFormKey((k) => k + 1);
    } catch {
      setError('Sem conexão. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    const blob = await compressImage(file);
    const body = new FormData();
    body.append('image', blob, 'boleto.jpg');
    await scan({ body });
  }

  const conf = result ? confidenceLabel(result.confidence) : null;

  return (
    <section className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
      <h2 className="text-lg font-semibold">Adicionar boleto por foto</h2>
      <p className="mb-4 text-sm text-neutral-500">
        Tire uma foto do boleto (ou da conta) e o sistema identifica o valor, o vencimento e a categoria. Você confere antes de salvar.
      </p>

      <div className="flex flex-wrap gap-2">
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
        <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
        <button type="button" disabled={busy} onClick={() => cameraRef.current?.click()} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
          📷 Tirar foto
        </button>
        <button type="button" disabled={busy} onClick={() => galleryRef.current?.click()} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700 disabled:opacity-50">
          🖼️ Escolher imagem
        </button>
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-neutral-500">Ou digite/cole a linha digitável</summary>
        <div className="mt-2 flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" placeholder="00000.00000 00000.000000 00000.000000 0 00000000000000" className={inputClass} />
          <button type="button" disabled={busy || code.replace(/\D/g, '').length < 44}
            onClick={() => scan({ headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code }) })}
            className="shrink-0 rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 disabled:opacity-50">
            Ler código
          </button>
        </div>
      </details>

      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Foto do boleto enviada" className="mt-4 max-h-48 rounded-lg border border-neutral-200 object-contain dark:border-neutral-800" />
      )}
      {busy && <p className="mt-4 text-sm text-neutral-500" role="status">Lendo o boleto…</p>}
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300" role="alert">{error}</p>}

      {result && (
        <form key={formKey} action={formAction} className="mt-5 space-y-3 border-t border-neutral-200 pt-5 dark:border-neutral-800">
          <p className={`text-sm font-medium ${conf!.cls}`}>
            {conf!.text}
            {result.codeValid === true && <span className="font-normal text-neutral-500"> · código de barras validado</span>}
          </p>

          {result.warnings.length > 0 && (
            <ul className="space-y-1 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              {result.warnings.map((w, i) => <li key={i}>⚠️ {w}</li>)}
            </ul>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs text-neutral-500 sm:col-span-2">Descrição
              <input name="description" required defaultValue={result.description} maxLength={200} className={inputClass} />
            </label>
            <label className="text-xs text-neutral-500">Valor (R$)
              <input name="amount" required type="number" step="0.01" min="0.01" defaultValue={result.amount ?? ''} className={inputClass} />
            </label>
            <label className="text-xs text-neutral-500">Vencimento
              <input name="dueDate" required type="date" defaultValue={result.dueDate ?? ''} className={inputClass} />
            </label>
            <label className="text-xs text-neutral-500 sm:col-span-2">Categoria
              <select name="categoryId" defaultValue={result.categoryId ?? ''} className={inputClass}>
                <option value="">Sem categoria</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </label>
            <label className="text-xs text-neutral-500 sm:col-span-2">Beneficiário
              <input name="beneficiary" defaultValue={result.beneficiary ?? ''} maxLength={200} className={inputClass} />
            </label>
          </div>

          <input type="hidden" name="barcode" value={result.codeValid ? result.barcode ?? '' : ''} />
          <input type="hidden" name="digitableLine" value={result.codeValid ? result.digitableLine ?? '' : ''} />
          <input type="hidden" name="source" value={result.origin === 'image' ? 'scan' : 'manual'} />
          <input type="hidden" name="scanConfidence" value={result.confidence.toFixed(2)} />

          {state.error && <p className="text-sm text-red-600" role="alert">{state.error}</p>}
          <div className="flex items-center gap-3">
            <SubmitButton />
            <button type="button" onClick={() => { setResult(null); setPreview(null); }} className="text-sm text-neutral-500 hover:underline">Descartar</button>
          </div>
        </form>
      )}
      {state.ok && !result && <p className="mt-4 text-sm text-emerald-600" role="status">✓ Boleto salvo.</p>}
    </section>
  );
}
