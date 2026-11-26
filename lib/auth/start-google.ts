import {NextResponse} from 'next/server';
import {readFormBody, routeError} from '@/lib/http';
import {getAppOrigin} from '@/lib/app-url';
import {checkRateLimit, verifySameOriginMutation} from '@/lib/security/rate-limit';
import {createGoogleFlow, googleAuthorizationUrl} from './google';
import {GOOGLE_FLOW_COOKIE, isApplicationConfigured} from '@/lib/drive/config';

export async function startGoogleSignIn(request: Request) {
  try {
    if (!verifySameOriginMutation(request)) return NextResponse.json({error: {code: 'FORBIDDEN', message: 'Asal permintaan tidak sah.'}}, {status: 403});
    if (!isApplicationConfigured()) return NextResponse.redirect(new URL('/auth/login?error=Koneksi%20Google%20sedang%20disiapkan%20pengelola.', request.url), 303);
    const rate = checkRateLimit({key: `google-login:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, limit: 20, windowMs: 60_000});
    if (!rate.allowed) return NextResponse.json({error: {code: 'RATE_LIMITED', message: 'Terlalu banyak permintaan. Coba lagi sebentar.'}}, {status: 429, headers: {'Retry-After': String(rate.retryAfterSeconds)}});
    const form = await readFormBody(request);
    const {flow, cookie} = createGoogleFlow(form.get('redirectTo'));
    const callback = new URL('/auth/callback', await getAppOrigin()).href;
    const response = NextResponse.redirect(googleAuthorizationUrl(flow, callback), 303);
    response.cookies.set(GOOGLE_FLOW_COOKIE, cookie, {httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600});
    return response;
  } catch (error) { return routeError(error); }
}
