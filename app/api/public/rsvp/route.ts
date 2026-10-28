import { NextResponse } from 'next/server';
import { submitPublicRsvpByToken } from '@/lib/db/repository';
import { RsvpStatus } from '@/lib/types';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { createAppError } from '@/lib/errors';
import { decodeInvitationConfig } from '@/lib/invitation/signing';

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'local-guest';
  const rl = checkRateLimit({
    key: `public_rsvp:${ip}`,
    limit: 15,
    windowMs: 60_000,
  });

  if (!rl.allowed) {
    return NextResponse.json(createAppError('RATE_LIMITED'), { status: 429 });
  }

  const formData = await request.formData();
  const rawToken = String(formData.get('token') ?? '');
  const rsvpStatus = (String(formData.get('rsvpStatus') ?? 'attending') as RsvpStatus) || 'attending';
  const attendeeCount = Number(formData.get('attendeeCount') ?? 1);
  const noteOptional = String(formData.get('noteOptional') ?? '');

  // Pertahankan konfigurasi desain undangan (hanya bila tanda tangannya valid).
  const rawDesign = String(formData.get('c') ?? '');
  const designSuffix = decodeInvitationConfig(rawDesign)
    ? `&c=${encodeURIComponent(rawDesign)}`
    : '';

  const res = submitPublicRsvpByToken({
    rawToken,
    rsvpStatus,
    attendeeCount,
    noteOptional,
  });

  if (!res.ok) {
    return NextResponse.redirect(
      new URL(
        `/i/${encodeURIComponent(rawToken)}?error=${encodeURIComponent(res.message)}${designSuffix}`,
        request.url
      ),
      303
    );
  }

  return NextResponse.redirect(
    new URL(`/i/${encodeURIComponent(rawToken)}?saved=1${designSuffix}`, request.url),
    303
  );
}

