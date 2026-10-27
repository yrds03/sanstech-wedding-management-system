import { NextResponse } from 'next/server';
import { getCurrentUserServer } from '@/lib/auth/session';
import { createAppError, getHttpStatusForError } from '@/lib/errors';
import { purgeEventTestingData } from '@/lib/db/repository';
import { verifySameOriginMutation } from '@/lib/security/rate-limit';

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

  const formData = await request.formData();
  const modeRaw = String(formData.get('mode') ?? 'reset_checkins_only');
  const mode =
    modeRaw === 'delete_all_test_guests'
      ? 'delete_all_test_guests'
      : modeRaw === 'restore_demo_samples'
      ? 'restore_demo_samples'
      : 'reset_checkins_only';

  const returnTo = String(formData.get('returnTo') ?? `/app/e/${context.params.id}`);

  const result = purgeEventTestingData({
    userId: user.userId,
    eventId: context.params.id,
    mode,
  });

  const paramKey = result.ok ? 'reset_notice' : 'error';
  return NextResponse.redirect(
    new URL(`${returnTo}?${paramKey}=${encodeURIComponent(result.message)}`, request.url),
    303
  );
}

