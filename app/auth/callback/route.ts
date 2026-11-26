import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {randomBytes} from 'node:crypto';
import {getAppOrigin} from '@/lib/app-url';
import {readGoogleFlow, exchangeGoogleCode} from '@/lib/auth/google';
import {DRIVE_SESSION_COOKIE, GOOGLE_FLOW_COOKIE, isApplicationConfigured} from '@/lib/drive/config';
import {driveDatabase} from '@/lib/drive/database';
export const maxDuration = 60;
export async function GET(request: Request) {
  const url = new URL(request.url);
  const jar = await cookies();
  const flowCookie = jar.get(GOOGLE_FLOW_COOKIE)?.value;
  jar.delete(GOOGLE_FLOW_COOKIE);
  const flow = isApplicationConfigured() ? readGoogleFlow(flowCookie, url.searchParams.get('state')) : null;
  const code = url.searchParams.get('code');
  if (flow && code && code.length <= 4096 && !url.searchParams.has('error')) {
    try {
      const identity = await exchangeGoogleCode(code, flow, new URL('/auth/callback', await getAppOrigin()).href);
      const token = randomBytes(32).toString('base64url');
      await driveDatabase.signIn(identity, token);
      const oldToken = jar.get(DRIVE_SESSION_COOKIE)?.value;
      if (oldToken) await driveDatabase.revoke(oldToken);
      const response = NextResponse.redirect(new URL(flow.next, request.url), 303);
      response.cookies.set(DRIVE_SESSION_COOKIE, token, {httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 7 * 86400});
      return response;
    } catch (error) { console.error('google_signin_failed', {name: error instanceof Error ? error.name : 'unknown'}); }
  }
  return NextResponse.redirect(new URL('/auth/login?error=Masuk%20dengan%20Google%20belum%20berhasil.%20Silakan%20coba%20lagi.', request.url), 303);
}
