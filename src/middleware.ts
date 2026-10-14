import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login');

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const userResult = await withTimeout(supabase.auth.getUser(), 4000);
  const user = userResult?.data?.user ?? null;

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone(); url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  let fullyAuthenticated = true;
  if (user) {
    const aalResult = await withTimeout(supabase.auth.mfa.getAuthenticatorAssuranceLevel(), 4000);
    const aal = aalResult?.data;
    if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== aal.nextLevel) fullyAuthenticated = false;
  }

  if (user && !fullyAuthenticated && !isAuthRoute) {
    const url = request.nextUrl.clone(); url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && fullyAuthenticated && isAuthRoute) {
    const url = request.nextUrl.clone(); url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
