import { NextResponse } from 'next/server';
import { getCurrentUserServer } from '@/lib/auth/session';
import { createAppError, getHttpStatusForError } from '@/lib/errors';
import {
  addInvitationGroupToEvent,
  listInvitationGroupsForEvent,
  rotateInvitationGroupToken,
} from '@/lib/db/repository';
import { GuestCategory, InvitationGroupType } from '@/lib/types';
import { verifySameOriginMutation } from '@/lib/security/rate-limit';

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  const user = await getCurrentUserServer();
  if (!user) {
    return NextResponse.json(createAppError('UNAUTHORIZED'), {
      status: getHttpStatusForError('UNAUTHORIZED'),
    });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get('q') ?? undefined;
  const category = url.searchParams.get('category') ?? undefined;

  const groups = listInvitationGroupsForEvent(user.userId, context.params.id, {
    query,
    category,
  });

  if (!groups) {
    return NextResponse.json(createAppError('NOT_FOUND'), {
      status: getHttpStatusForError('NOT_FOUND'),
    });
  }

  return NextResponse.json({ groups });
}

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
  const action = String(formData.get('action') ?? 'create');

  if (action === 'rotate_token') {
    const groupId = String(formData.get('groupId') ?? '');
    const rotated = rotateInvitationGroupToken({
      userId: user.userId,
      eventId: context.params.id,
      groupId,
    });

    if (!rotated.ok) {
      return NextResponse.redirect(
        new URL(
          `/app/e/${context.params.id}/invitations?error=${encodeURIComponent(
            rotated.error ?? 'Gagal memutar token.'
          )}`,
          request.url
        ),
        303
      );
    }

    return NextResponse.redirect(
      new URL(`/app/e/${context.params.id}/invitations?rotated=1`, request.url),
      303
    );
  }

  if (action === 'import_csv_lines') {
    const rawLines = String(formData.get('csvLines') ?? '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    let importedCount = 0;
    for (const line of rawLines) {
      // Format baris: Nama Penerima, Kapasitas, Kategori (regular/vip/vvip), Meja Opsional
      const parts = line.split(',').map((p) => p.trim());
      if (!parts[0] || parts[0].toLowerCase() === 'nama_penerima') continue;

      const cap = Number(parts[1] ?? 2) || 2;
      const catRaw = (parts[2] ?? 'regular').toLowerCase();
      const guestCategory: GuestCategory =
        catRaw === 'vvip' ? 'vvip' : catRaw === 'vip' ? 'vip' : 'regular';
      const tableLabelOptional = parts[3] || undefined;

      const res = addInvitationGroupToEvent({
        userId: user.userId,
        eventId: context.params.id,
        displayName: parts[0],
        type: cap > 2 ? 'family' : cap === 2 ? 'couple' : 'individual',
        capacity: cap,
        guestCategory,
        tableLabelOptional,
        allowedPublicDisplay: false,
      });

      if ('group' in res) {
        importedCount += 1;
      } else if (res.code === 'QUOTA_EXCEEDED') {
        return NextResponse.redirect(
          new URL(
            `/app/e/${context.params.id}/guests?error=${encodeURIComponent(
              `Berhasil mengimpor ${importedCount} baris, lalu terhenti: ${res.error}`
            )}`,
            request.url
          ),
          303
        );
      }
    }

    return NextResponse.redirect(
      new URL(`/app/e/${context.params.id}/guests?imported=${importedCount}`, request.url),
      303
    );
  }

  const displayName = String(formData.get('displayName') ?? '');
  const phoneOptional = String(formData.get('phoneOptional') ?? '');
  const type = (String(formData.get('type') ?? 'couple') as InvitationGroupType) || 'couple';
  const capacity = Number(formData.get('capacity') ?? 2);
  const guestCategory =
    (String(formData.get('guestCategory') ?? 'regular') as GuestCategory) || 'regular';
  const tableLabelOptional = String(formData.get('tableLabelOptional') ?? '');
  const notesPrivateOptional = String(formData.get('notesPrivateOptional') ?? '');
  const allowedPublicDisplay = formData.get('allowedPublicDisplay') === 'on';

  const result = addInvitationGroupToEvent({
    userId: user.userId,
    eventId: context.params.id,
    displayName,
    phoneOptional,
    type,
    capacity,
    guestCategory,
    tableLabelOptional,
    notesPrivateOptional,
    allowedPublicDisplay,
  });

  if ('error' in result) {
    return NextResponse.redirect(
      new URL(
        `/app/e/${context.params.id}/guests?error=${encodeURIComponent(result.error)}`,
        request.url
      ),
      303
    );
  }

  return NextResponse.redirect(
    new URL(`/app/e/${context.params.id}/guests?added=1`, request.url),
    303
  );
}

