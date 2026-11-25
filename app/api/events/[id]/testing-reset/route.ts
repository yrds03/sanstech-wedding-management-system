import { routeError, readFormBody } from '@/lib/http';
import { NextResponse } from 'next/server';
import { getCurrentUserServer } from '@/lib/auth/session';
import { createAppError, getHttpStatusForError } from '@/lib/errors';
import { purgeEventTestingData } from '@/lib/db/repository';
import { verifySameOriginMutation } from '@/lib/security/rate-limit';
import {isLocalDemoEnabled,safeRedirectPath} from '@/lib/config';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
  if(!isLocalDemoEnabled())return NextResponse.json(createAppError('FORBIDDEN','Reset ledger produksi tidak diizinkan. Gunakan koreksi kehadiran.'),{status:403});

  const params = await context.params;

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

  const formData = await readFormBody(request);
  const modeRaw = String(formData.get('mode') ?? 'reset_checkins_only');
  const mode =
    modeRaw === 'delete_all_test_guests'
      ? 'delete_all_test_guests'
      : modeRaw === 'restore_demo_samples'
      ? 'restore_demo_samples'
      : 'reset_checkins_only';

  const returnTo = safeRedirectPath(formData.get('returnTo'),`/app/e/${params.id}`);

  const result = (await purgeEventTestingData({
    userId: user.userId,
    eventId: params.id,
    mode,
  }));

  const paramKey = result.ok ? 'reset_notice' : 'error';
  return NextResponse.redirect(
    new URL(`${returnTo}?${paramKey}=${encodeURIComponent(result.message)}`, request.url),
    303
  );

  } catch (error) { return routeError(error); }
}

