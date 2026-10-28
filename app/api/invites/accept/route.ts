import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { DEV_SESSION_COOKIE_NAME, SIMULATION_RETURN_COOKIE_NAME } from '@/lib/auth/session';
import { redeemMemberInviteToken } from '@/lib/db/repository';
import { checkRateLimit, verifySameOriginMutation } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  if (!verifySameOriginMutation(request)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Origin request tidak sah.' } }, { status: 403 });
  }

  const ip = request.headers.get('x-forwarded-for') ?? 'local';
  const rl = checkRateLimit({ key: `invite_accept:${ip}`, limit: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Terlalu banyak percobaan. Coba lagi sebentar lagi.' } },
      { status: 429 }
    );
  }

  const formData = await request.formData();
  const token = String(formData.get('token') ?? '').trim();
  const result = redeemMemberInviteToken(token);

  if (!result.ok) {
    return NextResponse.redirect(
      new URL(`/invite/${encodeURIComponent(token)}?error=${encodeURIComponent(result.error)}`, request.url),
      303
    );
  }

  const cookieStore = cookies();
  cookieStore.set(DEV_SESSION_COOKIE_NAME, result.userId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  // Masuk lewat tautan undangan = sesi anggota sungguhan, bukan simulasi pemilik.
  cookieStore.delete(SIMULATION_RETURN_COOKIE_NAME);

  return NextResponse.redirect(new URL(`/app/e/${result.eventId}`, request.url), 303);
}
