import { routeError, readFormBody } from '@/lib/http';
import { NextResponse } from 'next/server';
import { getCurrentUserServer } from '@/lib/auth/session';
import { createAppError, getHttpStatusForError } from '@/lib/errors';
import { getAddOnsCatalog } from '@/lib/plans';
import { resetAllDataToZero, updateEventPlanByAdmin } from '@/lib/db/repository';
import {z} from 'zod';
import { verifySameOriginMutation } from '@/lib/security/rate-limit';
import {savePlatformPricing,pricingSchema} from '@/lib/plans/server';
import {isLocalDemoEnabled} from '@/lib/config';

export async function POST(request: Request) {
  try {

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

  const formData = await readFormBody(request);
  const action = String(formData.get('action') ?? 'update_pricing');

  if (action === 'reset_all_to_zero') {
    if(!isLocalDemoEnabled())return NextResponse.json(createAppError('FORBIDDEN','Reset data produksi tidak diizinkan.'),{status:403});
    (await resetAllDataToZero());
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
    const input=z.object({eventId:z.uuid(),planCode:z.enum(['free','pro','pro_plus'])}).safeParse({eventId:formData.get('eventId'),planCode:formData.get('planCode')});
    if(!input.success)return NextResponse.json(createAppError('VALIDATION_ERROR','Acara atau paket yang dipilih tidak valid.'),{status:400});
    const {eventId,planCode}=input.data;
    const res = (await updateEventPlanByAdmin({
      actorUserId: user.userId,
      eventId,
      planCode,
    }));

    return NextResponse.redirect(
      new URL(`/admin?notice=${encodeURIComponent(res.message)}`, request.url),
      303
    );
  }

  if(action!=='update_pricing')return NextResponse.json(createAppError('VALIDATION_ERROR','Tindakan pengaturan tidak dikenal.'),{status:400});

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

  const pricing=pricingSchema.safeParse({
    proPriceIdr,
    proPlusPriceIdr,
    gracePeriodDaysAfterEvent,
    addOnsPrices,
  });
  if(!pricing.success)return NextResponse.json(createAppError('VALIDATION_ERROR','Harga harus bilangan bulat valid dan masa akses 1–365 hari.'),{status:400});
  await savePlatformPricing(pricing.data);

  return NextResponse.redirect(
    new URL(
      `/admin?notice=${encodeURIComponent(
        'Harga paket, layanan dengan konfirmasi manual, dan masa akses acara berhasil diperbarui.'
      )}`,
      request.url
    ),
    303
  );

  } catch (error) { return routeError(error); }
}
