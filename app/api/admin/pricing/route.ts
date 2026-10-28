import { NextResponse } from 'next/server';
import { getCurrentUserServer } from '@/lib/auth/session';
import { createAppError, getHttpStatusForError } from '@/lib/errors';
import { getAddOnsCatalog, updatePlatformPricingAndRetention } from '@/lib/plans';
import { resetAllDataToZero, updateEventPlanByAdmin } from '@/lib/db/repository';
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
      createAppError(
        'FORBIDDEN',
        'Hanya Super Admin pemilik platform yang memiliki akses ke pengaturan harga.'
      ),
      { status: getHttpStatusForError('FORBIDDEN') }
    );
  }

  const formData = await request.formData();
  const action = String(formData.get('action') ?? 'update_pricing');

  if (action === 'reset_all_to_zero') {
    resetAllDataToZero();
    return NextResponse.redirect(
      new URL(
        `/admin?notice=${encodeURIComponent(
          'Seluruh data acara, daftar tamu, dan riwayat check-in telah dikosongkan total kembali ke 0!'
        )}`,
        request.url
      ),
      303
    );
  }

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

  const addOnsPrices: Record<string, number> = {};
  for (const addon of getAddOnsCatalog()) {
    const rawVal = formData.get(`addon_${addon.code}`);
    if (rawVal !== null) {
      const parsed = Number(rawVal);
      if (Number.isFinite(parsed) && parsed >= 0) {
        addOnsPrices[addon.code] = parsed;
      }
    }
  }

  updatePlatformPricingAndRetention({
    proPriceIdr,
    proPlusPriceIdr,
    gracePeriodDaysAfterEvent,
    addOnsPrices,
  });

  return NextResponse.redirect(
    new URL(
      `/admin?notice=${encodeURIComponent(
        'Harga paket utama, harga 10 layanan Add-On, & masa aktif akun pasca-acara berhasil diperbarui!'
      )}`,
      request.url
    ),
    303
  );
}
