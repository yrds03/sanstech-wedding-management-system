import { routeError, readFormBody } from '@/lib/http';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isLocalDemoEnabled, safeRedirectPath } from '@/lib/config';
import { DEMO_USERS } from '@/lib/db/demo-repository';
import { signDemoSession } from '@/lib/auth/demo-session';
import { DEV_SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { verifySameOriginMutation } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  try {

  if (!isLocalDemoEnabled()) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Halaman tidak ditemukan.' } }, { status: 404 });
  if (!verifySameOriginMutation(request)) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Asal permintaan tidak sah.' } }, { status: 403 });
  const form = await readFormBody(request);
  const userId = String(form.get('userId') ?? '');
  if (!Object.hasOwn(DEMO_USERS, userId)) return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Akun simulasi tidak valid.' } }, { status: 400 });
  const jar = await cookies();
  jar.set(DEV_SESSION_COOKIE_NAME,signDemoSession(userId), { httpOnly:true,sameSite:'lax',path:'/',maxAge:8*60*60 });
  return NextResponse.redirect(new URL(safeRedirectPath(form.get('redirectTo')),request.url),303);

  } catch (error) { return routeError(error); }
}
