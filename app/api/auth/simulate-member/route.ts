import { routeError, readFormBody } from '@/lib/http';
import { NextResponse } from 'next/server';
import { isLocalDemoEnabled } from '@/lib/config';
import { signDemoSession } from '@/lib/auth/demo-session';
import { cookies } from 'next/headers';
import {
  DEV_SESSION_COOKIE_NAME,
  SIMULATION_RETURN_COOKIE_NAME,
  getCurrentUserServer,
} from '@/lib/auth/session';
import { resolveMemberSimulationTarget } from '@/lib/db/repository';
import { verifySameOriginMutation } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  try {

  if (!isLocalDemoEnabled()) return NextResponse.json({error:{code:'NOT_FOUND',message:'Halaman tidak ditemukan.'}},{status:404});
  if (!verifySameOriginMutation(request)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Origin request tidak sah.' } }, { status: 403 });
  }

  const actor = await getCurrentUserServer();
  if (!actor) {
    return NextResponse.redirect(new URL('/auth/login', request.url), 303);
  }

  const formData = await readFormBody(request);
  const eventId = String(formData.get('eventId') ?? '');
  const inviteId = String(formData.get('inviteId') ?? '');

  const target = (await resolveMemberSimulationTarget({
    actorUserId: actor.userId,
    eventId,
    inviteId,
  }));

  if (!target.ok) {
    return NextResponse.redirect(
      new URL(`/app/e/${encodeURIComponent(eventId)}/team?error=${encodeURIComponent(target.error)}`, request.url),
      303
    );
  }

  const cookieStore = await cookies();
  const base = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  };
  // Simpan akun asal hanya saat belum dalam mode simulasi (agar tidak tertimpa simulasi bertingkat).
  if (!cookieStore.get(SIMULATION_RETURN_COOKIE_NAME)?.value) {
    cookieStore.set(SIMULATION_RETURN_COOKIE_NAME, signDemoSession(actor.userId), base);
  }
  cookieStore.set(DEV_SESSION_COOKIE_NAME, signDemoSession(target.userId), base);

  return NextResponse.redirect(new URL(`/app/e/${target.eventId}`, request.url), 303);

  } catch (error) { return routeError(error); }
}

