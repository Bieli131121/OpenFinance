import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente do navegador, criado de forma preguiçosa: só é instanciado no primeiro uso
 * (em handlers/efeitos, sempre no navegador). Assim o build/prerender não quebra
 * quando as variáveis de ambiente ainda não existem.
 */
export function createClient(): SupabaseClient {
  let real: SupabaseClient | null = null;
  const get = () =>
    (real ??= createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ) as unknown as SupabaseClient);
  return new Proxy({} as SupabaseClient, {
    get: (_t, prop) => Reflect.get(get() as object, prop),
  });
}
