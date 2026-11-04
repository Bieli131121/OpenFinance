'use client';

import { useState } from 'react';

/**
 * Alterna entre um botão "✏️ editar" e um formulário inline. Os campos do
 * formulário vêm como children (inputs normais, com defaultValue já
 * preenchido pela página que usa este componente). Ao salvar, chama a
 * Server Action passada e fecha o formulário.
 */
export function InlineEdit({
  action, id, children, hiddenName = 'id',
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  children: React.ReactNode;
  hiddenName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="text-xs text-neutral-400 hover:text-brand-500" title="Editar">
        ✏️
      </button>
    );
  }

  return (
    <form
      action={async (formData: FormData) => {
        setSaving(true);
        try {
          await action(formData);
          setEditing(false);
        } finally {
          setSaving(false);
        }
      }}
      className="mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-900"
    >
      <input type="hidden" name={hiddenName} value={id} />
      {children}
      <button type="submit" disabled={saving} className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50">
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
      <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs dark:border-neutral-700">
        Cancelar
      </button>
    </form>
  );
}
