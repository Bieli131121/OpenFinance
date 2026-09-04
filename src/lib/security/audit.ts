import { createClient } from '@/lib/supabase/server';

/**
 * Registra uma ação sensível na tabela audit_logs. Chamar isso não deve nunca
 * quebrar o fluxo principal -- se o log falhar, a ação do usuário já aconteceu
 * e não deve ser revertida por causa disso, então os erros são só logados no
 * console do servidor.
 */
export async function logAudit(action: string, entity?: string, entityId?: string, metadata?: Record<string, unknown>) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('audit_logs').insert({
      user_id: user?.id ?? null,
      action,
      entity: entity ?? null,
      entity_id: entityId ?? null,
      metadata: metadata ?? null,
    });
  } catch (err) {
    console.error('[audit] falha ao registrar log:', err);
  }
}
