import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured } from '@/lib/db/supabase-browser';
import { isLocalDemoEnabled } from '@/lib/config';
import { verifySameOriginMutation } from '@/lib/security/rate-limit';

export async function proxy(request: NextRequest) {
  const isApi = request.nextUrl.pathname.startsWith('/api/');
  if(request.nextUrl.pathname==='/api/health')return NextResponse.next();
  if (isApi && !['GET','HEAD','OPTIONS'].includes(request.method) && !verifySameOriginMutation(request)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Asal permintaan tidak sah.' } }, { status: 403 });
  }
  if (isApi && Number(request.headers.get('content-length') ?? 0) > 5 * 1024 * 1024) {
    return NextResponse.json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Ukuran permintaan maksimal 5 MB.' } }, { status: 413 });
  }
  const privatePath = /^\/(app|admin|onboarding)(\/|$)/.test(request.nextUrl.pathname);
  const publicDataPath = /^\/(i|invite|display)(\/|$)/.test(request.nextUrl.pathname);
  if (!isSupabaseConfigured()) {
    if (!isLocalDemoEnabled() && (privatePath || publicDataPath || (isApi && !request.nextUrl.pathname.startsWith('/api/auth/')))) {
      if (isApi) return NextResponse.json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Layanan database belum dikonfigurasi.' } }, { status: 503 });
      return NextResponse.redirect(new URL('/status', request.url));
    }
    return NextResponse.next();
  }
  let response = NextResponse.next({ request });
  const db = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({name,value}) => request.cookies.set(name,value));
        response = NextResponse.next({request});
        cookiesToSet.forEach(({name,value,options}) => response.cookies.set(name,value,options));
      },
    },
  });
  const { data: { user } } = await db.auth.getUser();
  if (privatePath && !user) {
    const login = new URL('/auth/login',request.url);
    login.searchParams.set('next',request.nextUrl.pathname+request.nextUrl.search);
    const redirect = NextResponse.redirect(login);
    response.cookies.getAll().forEach(c=>redirect.cookies.set(c));
    return redirect;
  }
  if (privatePath || isApi || request.nextUrl.pathname.startsWith('/auth/')) response.headers.set('Cache-Control','private, no-store');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'] };
