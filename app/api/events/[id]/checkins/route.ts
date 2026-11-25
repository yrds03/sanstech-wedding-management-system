import { routeError, readFormBody } from '@/lib/http';
import { NextResponse } from 'next/server';
import { getCurrentUserServer } from '@/lib/auth/session';
import { createAppError, getHttpStatusForError } from '@/lib/errors';
import { recordEventCheckinOrCorrection } from '@/lib/db/repository';
import { CheckinMethod } from '@/lib/types';
import { checkRateLimit, verifySameOriginMutation } from '@/lib/security/rate-limit';
import {cookies} from 'next/headers';
import {z} from 'zod';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {

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

  const rl = checkRateLimit({
    key: `checkin:${user.userId}:${params.id}`,
    limit: 60,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return NextResponse.json(createAppError('RATE_LIMITED'), { status: 429 });
  }

  const formData = await readFormBody(request);
  const method = (String(formData.get('method') ?? 'qr') as CheckinMethod) || 'qr';
  const groupIdOrQrToken = String(formData.get('groupIdOrQrToken') ?? '');
  const deltaAttendees = Number(formData.get('deltaAttendees') ?? 1);
  const reasonNullable = String(formData.get('reasonNullable') ?? '');
  const idempotencyKey =
    String(formData.get('idempotencyKey') ?? '').trim() || crypto.randomUUID();
  if(!['qr','manual','correction'].includes(method) || !Number.isInteger(deltaAttendees) || deltaAttendees===0 || Math.abs(deltaAttendees)>20 ||
    (method!=='correction' && deltaAttendees<0) || !z.string().uuid().safeParse(idempotencyKey).success) {
    return NextResponse.json(createAppError('VALIDATION_ERROR','Jumlah, metode, atau kunci permintaan tidak valid.'),{status:400});
  }
  const jar=await cookies();
  const existingDevice=jar.get('sanstech_scanner_device')?.value;
  const deviceKey=z.string().uuid().safeParse(existingDevice).success ? existingDevice! : crypto.randomUUID();
  jar.set('sanstech_scanner_device',deviceKey,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:86400});

  const res = (await recordEventCheckinOrCorrection({
    userId: user.userId,
    eventId: params.id,
    groupIdOrQrToken,
    deltaAttendees,
    method,
    reasonNullable,
    idempotencyKey,
    deviceKey,
  }));

  if (!res.ok) {
    return NextResponse.redirect(
      new URL(
        `/app/e/${params.id}/checkin?error=${encodeURIComponent(res.message)}`,
        request.url
      ),
      303
    );
  }

  return NextResponse.redirect(
    new URL(
      `/app/e/${params.id}/checkin?success=${encodeURIComponent(res.message)}`,
      request.url
    ),
    303
  );

  } catch (error) { return routeError(error); }
}

