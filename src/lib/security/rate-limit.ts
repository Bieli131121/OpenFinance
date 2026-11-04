import { createClient } from '@/lib/supabase/server';

/**
 * Rate limiting simples baseado em contagem de linhas recentes no Postgres.
 * Suficiente para proteger rotas sensíveis (exportação de dados, exclusão de
 * conta, geração de relatórios) sem depender de infraestrutura externa
 * (Redis/Upstash). Para tráfego alto de verdade, trocar por um rate limiter
 * de borda (ex: Upstash Ratelimit no middleware) é o próximo passo.
 */
export async function checkRateLimit(action: string, maxRequests: number, windowMinutes: number): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { allowed: false };

  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from('rate_limit_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('action', action)
    .gte('created_at', windowStart);

  if (error) {
    // Em caso de falha ao checar, é mais seguro negar do que permitir sem limite.
    return { allowed: false };
  }

  if ((count ?? 0) >= maxRequests) {
    return { allowed: false, retryAfterSeconds: windowMinutes * 60 };
  }

  await supabase.from('rate_limit_log').insert({ user_id: user.id, action });
  return { allowed: true };
}
