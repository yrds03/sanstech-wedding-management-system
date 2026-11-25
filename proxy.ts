import { createServerClient } from '@supabase/ssr';
import type {User} from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured } from '@/lib/db/supabase-browser';
import { isLocalDemoEnabled } from '@/lib/config';
import { verifySameOriginMutation } from '@/lib/security/rate-limit';

export async function proxy(request: NextRequest) {
  const isApi = request.nextUrl.pathname.startsWith('/api/');
  const privatePath = /^\/(app|admin|onboarding)(\/|$)/.test(request.nextUrl.pathname);
  const publicDataPath = /^\/(i|invite|display)(\/|$)/.test(request.nextUrl.pathname);
  const sensitivePath=isApi||privatePath||publicDataPath||request.nextUrl.pathname.startsWith('/auth/');
  const finish=(result:NextResponse)=>{
    if(sensitivePath){result.headers.set('Cache-Control','private, no-store');result.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');result.headers.set('Referrer-Policy','same-origin');}
    return result;
  };
  if(request.nextUrl.pathname==='/api/health')return NextResponse.next();
  if (isApi && !['GET','HEAD','OPTIONS'].includes(request.method) && !verifySameOriginMutation(request)) {
    return finish(NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Asal permintaan tidak sah.' } }, { status: 403 }));
  }
  if (isApi && Number(request.headers.get('content-length') ?? 0) > 5 * 1024 * 1024) {
    return finish(NextResponse.json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Ukuran permintaan maksimal 5 MB.' } }, { status: 413 }));
  }
  if (!isSupabaseConfigured()) {
    if (!isLocalDemoEnabled() && (privatePath || publicDataPath || (isApi && !request.nextUrl.pathname.startsWith('/api/auth/')))) {
      if (isApi) return finish(NextResponse.json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Layanan database belum dikonfigurasi.' } }, { status: 503 }));
      return finish(NextResponse.redirect(new URL('/status', request.url)));
    }
    return finish(NextResponse.next());
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
  let user:User|null=null;
  try {const auth=await db.auth.getUser();user=auth.data.user;}
  catch {
    if(privatePath||isApi)return finish(NextResponse.json({error:{code:'SERVICE_UNAVAILABLE',message:'Layanan akun belum dapat dihubungi. Coba lagi sebentar.'}},{status:503}));
    return finish(response);
  }
  if (privatePath && !user) {
    const login = new URL('/auth/login',request.url);
    login.searchParams.set('next',request.nextUrl.pathname+request.nextUrl.search);
    const redirect = NextResponse.redirect(login);
    response.cookies.getAll().forEach(c=>redirect.cookies.set(c));
    return finish(redirect);
  }
  return finish(response);
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'] };
