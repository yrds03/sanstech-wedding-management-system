import { NextResponse } from 'next/server';
import { getCurrentUserServer } from '@/lib/auth/session';
import { createAppError, getHttpStatusForError } from '@/lib/errors';
import { updateEventInvitationConfig } from '@/lib/db/repository';
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
  const result = updateEventInvitationConfig({
    userId: user.userId,
    eventId: context.params.id,
    rawConfig: {
      themeStyle: formData.get('themeStyle'),
      customGreeting: formData.get('customGreeting'),
      quoteText: formData.get('quoteText'),
      dressCode: formData.get('dressCode'),
      mapsUrl: formData.get('mapsUrl'),
      digitalGiftBank: formData.get('digitalGiftBank'),
      closingMessage: formData.get('closingMessage'),
      whiteLabelBrandName: formData.get('whiteLabelBrandName'),
    },
  });

  const base = `/app/e/${context.params.id}/invitations`;
  if ('error' in result) {
    return NextResponse.redirect(
      new URL(`${base}?error=${encodeURIComponent(result.error)}`, request.url),
      303
    );
  }

  return NextResponse.redirect(new URL(`${base}?design_saved=1`, request.url), 303);
}

