import { routeError, readFormBody } from '@/lib/http';
import { guestSchema } from '@/lib/validators/guest';
import { importInvitationGroups } from '@/lib/db/repository';
import { NextResponse } from 'next/server';
import { getCurrentUserServer } from '@/lib/auth/session';
import { createAppError, getHttpStatusForError } from '@/lib/errors';
import {
  addInvitationGroupToEvent,
  listInvitationGroupsForEvent,
  rotateInvitationGroupToken,
  updateInvitationGroup,
} from '@/lib/db/repository';
import { GuestCategory, InvitationGroupType } from '@/lib/types';
import { verifySameOriginMutation } from '@/lib/security/rate-limit';
import { parseGuestImportText } from '@/lib/spreadsheet/guest-import';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {

  const params = await context.params;

  const user = await getCurrentUserServer();
  if (!user) {
    return NextResponse.json(createAppError('UNAUTHORIZED'), {
      status: getHttpStatusForError('UNAUTHORIZED'),
    });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get('q') ?? undefined;
  const category = url.searchParams.get('category') ?? undefined;

  const groups = (await listInvitationGroupsForEvent(user.userId, params.id, {
    query,
    category,
  }));

  if (!groups) {
    return NextResponse.json(createAppError('NOT_FOUND'), {
      status: getHttpStatusForError('NOT_FOUND'),
    });
  }

  return NextResponse.json({ groups });

  } catch (error) { return routeError(error); }
}

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

  const formData = await readFormBody(request);
  const action = String(formData.get('action') ?? 'create');

  if (action === 'rotate_token') {
    const groupId = String(formData.get('groupId') ?? '');
    const rotated = (await rotateInvitationGroupToken({
      userId: user.userId,
      eventId: params.id,
      groupId,
    }));

    if (!rotated.ok) {
      return NextResponse.redirect(
        new URL(
          `/app/e/${params.id}/invitations?error=${encodeURIComponent(
            rotated.error ?? 'Gagal memutar token.'
          )}`,
          request.url
        ),
        303
      );
    }

    return NextResponse.redirect(
      new URL(`/app/e/${params.id}/invitations?rotated=1`, request.url),
      303
    );
  }

  if (action === 'import_csv_lines') {
    const parsed = parseGuestImportText(String(formData.get('csvLines') ?? ''));
    if(parsed.errors.length || !parsed.rows.length) return NextResponse.redirect(new URL('/app/e/'+params.id+'/guests?error='+encodeURIComponent(parsed.errors[0]??'Data impor kosong.'),request.url),303);
    const rows=parsed.rows.map(row=>({...row,type:(row.capacity>2?'family':row.capacity===2?'couple':'individual') as InvitationGroupType}));
    const result=await importInvitationGroups({userId:user.userId,eventId:params.id,rows});
    return NextResponse.redirect(new URL('/app/e/'+params.id+'/guests?'+(result.ok?'imported='+result.importedCount:'error='+encodeURIComponent(result.error??'Impor dibatalkan.')),request.url),303);
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

  const validated=guestSchema.safeParse({displayName,phoneOptional,type,capacity,guestCategory,tableLabelOptional,notesPrivateOptional,allowedPublicDisplay});
  if(!validated.success) return NextResponse.redirect(new URL('/app/e/'+params.id+'/guests?error='+encodeURIComponent(validated.error.issues[0]?.message??'Data tamu tidak valid.'),request.url),303);
  if(action==='update') {
    const updated=await updateInvitationGroup({...validated.data,userId:user.userId,eventId:params.id,groupId:String(formData.get('groupId')??'')});
    return NextResponse.redirect(new URL(`/app/e/${params.id}/guests?${updated.ok?'updated=1':'error='+encodeURIComponent(updated.error??'Perubahan gagal disimpan.')}`,request.url),303);
  }
  const result = (await addInvitationGroupToEvent({
    userId: user.userId,
    eventId: params.id,
    displayName,
    phoneOptional,
    type,
    capacity,
    guestCategory,
    tableLabelOptional,
    notesPrivateOptional,
    allowedPublicDisplay,
  }));

  if ('error' in result) {
    return NextResponse.redirect(
      new URL(
        `/app/e/${params.id}/guests?error=${encodeURIComponent(result.error)}`,
        request.url
      ),
      303
    );
  }

  return NextResponse.redirect(
    new URL(`/app/e/${params.id}/guests?added=1`, request.url),
    303
  );

  } catch (error) { return routeError(error); }
}

