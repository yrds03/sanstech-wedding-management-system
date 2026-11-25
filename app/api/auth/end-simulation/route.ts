import { routeError, readFormBody } from '@/lib/http';
import { NextResponse } from 'next/server';
import { isLocalDemoEnabled } from '@/lib/config';
import { readDemoSession, signDemoSession } from '@/lib/auth/demo-session';
import { cookies } from 'next/headers';
import { DEV_SESSION_COOKIE_NAME, SIMULATION_RETURN_COOKIE_NAME } from '@/lib/auth/session';
import { getUserProfileById } from '@/lib/db/repository';
import { verifySameOriginMutation } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  try {

  if (!isLocalDemoEnabled()) return NextResponse.json({error:{code:'NOT_FOUND',message:'Halaman tidak ditemukan.'}},{status:404});
  if (!verifySameOriginMutation(request)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Origin request tidak sah.' } }, { status: 403 });
  }

  const cookieStore = await cookies();
  const returnUid = readDemoSession(cookieStore.get(SIMULATION_RETURN_COOKIE_NAME)?.value);
  cookieStore.delete(SIMULATION_RETURN_COOKIE_NAME);

  const formData = await readFormBody(request);
  const returnTo = String(formData.get('returnTo') ?? '');
  const safeReturn = returnTo.startsWith('/app/') ? returnTo : '/app/workspaces';

  if (returnUid && (await getUserProfileById(returnUid))) {
    cookieStore.set(DEV_SESSION_COOKIE_NAME, signDemoSession(returnUid), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return NextResponse.redirect(new URL(safeReturn, request.url), 303);
  }

  cookieStore.delete(DEV_SESSION_COOKIE_NAME);
  return NextResponse.redirect(new URL('/auth/login', request.url), 303);

  } catch (error) { return routeError(error); }
}

