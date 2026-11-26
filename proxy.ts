import {NextResponse, type NextRequest} from 'next/server';
import {isDriveConfigured, isGoogleAuthConfigured, DRIVE_SESSION_COOKIE} from '@/lib/drive/config';
import {isLocalDemoEnabled} from '@/lib/config';
import {verifySameOriginMutation} from '@/lib/security/rate-limit';
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApi = pathname.startsWith('/api/');
  const privatePath = /^\/(app|admin|onboarding)(\/|$)/.test(pathname);
  const dataPath = /^\/(i|invite|display)(\/|$)/.test(pathname);
  const sensitive = isApi || privatePath || dataPath || pathname.startsWith('/auth/');
  const finish = (response: NextResponse) => {
    if (sensitive) {
      response.headers.set('Cache-Control', 'private, no-store');
      response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
      response.headers.set('Referrer-Policy', 'same-origin');
    }
    return response;
  };
  if (isApi && !['GET', 'HEAD', 'OPTIONS'].includes(request.method) && !verifySameOriginMutation(request))
    return finish(NextResponse.json({error: {code: 'FORBIDDEN', message: 'Asal permintaan tidak sah.'}}, {status: 403}));
  if (isApi && Number(request.headers.get('content-length') ?? 0) > 5 * 1024 * 1024)
    return finish(NextResponse.json({error: {code: 'PAYLOAD_TOO_LARGE', message: 'Ukuran permintaan maksimal 5 MB.'}}, {status: 413}));
  if (pathname === '/api/health') return finish(NextResponse.next());
  if (!isLocalDemoEnabled()) {
    if ((!isDriveConfigured() || (privatePath && !isGoogleAuthConfigured())) && (privatePath || dataPath || (isApi && !pathname.startsWith('/api/auth/')))) {
      return finish(isApi ? NextResponse.json({error: {code: 'SERVICE_UNAVAILABLE', message: 'Penyimpanan Google Drive belum dikonfigurasi.'}}, {status: 503}) :
        NextResponse.redirect(new URL('/status', request.url)));
    }
    // Redirect optimization only; every page/action verifies the database session.
    if (privatePath && !request.cookies.get(DRIVE_SESSION_COOKIE)) {
      const login = new URL('/auth/login', request.url);
      login.searchParams.set('next', pathname + request.nextUrl.search);
      return finish(NextResponse.redirect(login));
    }
  }
  return finish(NextResponse.next());
}
export const config = {matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)']};
