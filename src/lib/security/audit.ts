import { createClient } from '@/lib/supabase/server';
export async function logAudit(action: string, entity?: string, entityId?: string, metadata?: Record<string, unknown>) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('audit_logs').insert({ user_id: user?.id ?? null, action, entity: entity ?? null, entity_id: entityId ?? null, metadata: metadata ?? null });
  } catch (err) { console.error('[audit] falha ao registrar log:', err); }
}
