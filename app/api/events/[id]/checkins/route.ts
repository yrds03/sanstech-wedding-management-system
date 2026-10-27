import { NextResponse } from 'next/server';
import { getCurrentUserServer } from '@/lib/auth/session';
import { createAppError, getHttpStatusForError } from '@/lib/errors';
import { recordEventCheckinOrCorrection } from '@/lib/db/repository';
import { CheckinMethod } from '@/lib/types';
import { checkRateLimit, verifySameOriginMutation } from '@/lib/security/rate-limit';

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  if (!verifySameOriginMutation(request)) {
    return NextResponse.json(createAppError('FORBIDDEN', 'Origin request tidak sah.'), {
      status: 403,
    });
  }

  const user = await getCurrentUserServer();
  if (!user) {
    return NextResponse.json(createAppError('UNAUTHORIZED'), {
      status: getHttpStatusForError('UNAUTHORIZED'),
    });
  }

  const rl = checkRateLimit({
    key: `checkin:${user.userId}:${context.params.id}`,
    limit: 60,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return NextResponse.json(createAppError('RATE_LIMITED'), { status: 429 });
  }

  const formData = await request.formData();
  const method = (String(formData.get('method') ?? 'qr') as CheckinMethod) || 'qr';
  const groupIdOrQrToken = String(formData.get('groupIdOrQrToken') ?? '');
  const deltaAttendees = Number(formData.get('deltaAttendees') ?? 1);
  const reasonNullable = String(formData.get('reasonNullable') ?? '');
  const idempotencyKey =
    String(formData.get('idempotencyKey') ?? '').trim() || crypto.randomUUID();

  const res = recordEventCheckinOrCorrection({
    userId: user.userId,
    eventId: context.params.id,
    groupIdOrQrToken,
    deltaAttendees,
    method,
    reasonNullable,
    idempotencyKey,
  });

  if (!res.ok) {
    return NextResponse.redirect(
      new URL(
        `/app/e/${context.params.id}/checkin?error=${encodeURIComponent(res.message)}`,
        request.url
      ),
      303
    );
  }

  return NextResponse.redirect(
    new URL(
      `/app/e/${context.params.id}/checkin?success=${encodeURIComponent(res.message)}`,
      request.url
    ),
    303
  );
}

