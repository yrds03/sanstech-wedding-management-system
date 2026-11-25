import { routeError, readFormBody } from '@/lib/http';
import { NextResponse } from 'next/server';
import { acceptMemberInviteByToken } from '@/lib/db/repository';
import { getCurrentUserServer } from '@/lib/auth/session';
import { checkRateLimit, verifySameOriginMutation } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  try {

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

  const formData = await readFormBody(request);
  const token = String(formData.get('token') ?? '').trim();
  const user = await getCurrentUserServer();
  if (!user) return NextResponse.redirect(new URL(`/auth/login?next=${encodeURIComponent(`/invite/${token}`)}`, request.url),303);
  const result = await acceptMemberInviteByToken({userId:user.userId,rawToken:token});

  if (!result.ok) {
    return NextResponse.redirect(
      new URL(`/invite/${encodeURIComponent(token)}?error=${encodeURIComponent(result.error ?? 'Undangan tidak berlaku.')}`, request.url),
      303
    );
  }

  return NextResponse.redirect(new URL(`/app/e/${result.eventId}`, request.url), 303);

  } catch (error) { return routeError(error); }
}
