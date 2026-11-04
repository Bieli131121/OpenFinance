import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente com a service role key — ignora RLS. USAR SOMENTE em código
 * server-side que precisa de operações administrativas (ex: excluir a conta
 * do usuário no Auth). NUNCA importar isso em um componente client ('use client')
 * nem expor essa chave com o prefixo NEXT_PUBLIC_.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
