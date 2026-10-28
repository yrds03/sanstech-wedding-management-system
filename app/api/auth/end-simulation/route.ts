import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { DEV_SESSION_COOKIE_NAME, SIMULATION_RETURN_COOKIE_NAME } from '@/lib/auth/session';
import { getUserProfileById } from '@/lib/db/repository';
import { verifySameOriginMutation } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  if (!verifySameOriginMutation(request)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Origin request tidak sah.' } }, { status: 403 });
  }

  const cookieStore = cookies();
  const returnUid = cookieStore.get(SIMULATION_RETURN_COOKIE_NAME)?.value;
  cookieStore.delete(SIMULATION_RETURN_COOKIE_NAME);

  const formData = await request.formData();
  const returnTo = String(formData.get('returnTo') ?? '');
  const safeReturn = returnTo.startsWith('/app/') ? returnTo : '/app/workspaces';

  if (returnUid && getUserProfileById(returnUid)) {
    cookieStore.set(DEV_SESSION_COOKIE_NAME, returnUid, {
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
}

