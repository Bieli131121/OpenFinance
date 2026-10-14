'use client';
export function DeleteButton({ action, id, confirmMessage }: { action: (formData: FormData) => Promise<void>; id: string; confirmMessage?: string }) {
  return (
    <form action={action} onSubmit={(e) => { if (!confirm(confirmMessage ?? 'Tem certeza que deseja excluir?')) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-xs text-neutral-400 hover:text-red-500" title="Excluir">🗑️</button>
    </form>
  );
}
