import { createClient } from '@/lib/supabase/server';
export async function checkRateLimit(action: string, maxRequests: number, windowMinutes: number): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { allowed: false };
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const { count, error } = await supabase.from('rate_limit_log').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('action', action).gte('created_at', windowStart);
  if (error) return { allowed: false };
  if ((count ?? 0) >= maxRequests) return { allowed: false, retryAfterSeconds: windowMinutes * 60 };
  await supabase.from('rate_limit_log').insert({ user_id: user.id, action });
  return { allowed: true };
}
