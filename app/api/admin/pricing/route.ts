import { NextResponse } from 'next/server';
import { getCurrentUserServer } from '@/lib/auth/session';
import { createAppError, getHttpStatusForError } from '@/lib/errors';
import { updatePlatformPricingAndRetention } from '@/lib/plans';
import { updateEventPlanByAdmin } from '@/lib/db/repository';
import { PlanCode } from '@/lib/types';
import { verifySameOriginMutation } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  if (!verifySameOriginMutation(request)) {
    return NextResponse.json(createAppError('FORBIDDEN', 'Origin request tidak sah.'), {
      status: 403,
    });
  }

  const user = await getCurrentUserServer();
  if (!user || !user.isPlatformAdmin) {
    return NextResponse.json(
      createAppError('FORBIDDEN', 'Hanya Super Admin yang memiliki akses ke pengaturan harga platform.'),
      { status: getHttpStatusForError('FORBIDDEN') }
    );
  }

  const formData = await request.formData();
  const action = String(formData.get('action') ?? 'update_pricing');

  if (action === 'activate_event_plan') {
    const eventId = String(formData.get('eventId') ?? '');
    const planCode = (String(formData.get('planCode') ?? 'pro') as PlanCode) || 'pro';
    const res = updateEventPlanByAdmin({
      actorUserId: user.userId,
      eventId,
      planCode,
    });

    return NextResponse.redirect(
      new URL(`/admin?notice=${encodeURIComponent(res.message)}`, request.url),
      303
    );
  }

  const proPriceIdr = Number(formData.get('proPriceIdr') ?? 1490000);
  const proPlusPriceIdr = Number(formData.get('proPlusPriceIdr') ?? 3490000);
  const gracePeriodDaysAfterEvent = Number(formData.get('gracePeriodDaysAfterEvent') ?? 14);

  updatePlatformPricingAndRetention({
    proPriceIdr,
    proPlusPriceIdr,
    gracePeriodDaysAfterEvent,
  });

  return NextResponse.redirect(
    new URL(
      `/admin?notice=${encodeURIComponent(
        'Harga paket & aturan masa aktif akun pasca-acara berhasil diperbarui!'
      )}`,
      request.url
    ),
    303
  );
}

