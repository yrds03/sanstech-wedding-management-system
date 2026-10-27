import { NextResponse } from 'next/server';
import { getCurrentUserServer } from '@/lib/auth/session';
import { createAppError, getHttpStatusForError } from '@/lib/errors';
import {
  createEventMemberInvite,
  getEventIfAuthorized,
  listMemberInvitesForEvent,
  revokeEventMemberInvite,
} from '@/lib/db/repository';
import { canInviteWithEventRole } from '@/lib/permissions';
import { EventRole } from '@/lib/types';

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const user = await getCurrentUserServer();
  if (!user) {
    return NextResponse.json(createAppError('UNAUTHORIZED'), {
      status: getHttpStatusForError('UNAUTHORIZED'),
    });
  }

  const invites = listMemberInvitesForEvent(user.userId, context.params.id);
  if (!invites) {
    return NextResponse.json(createAppError('NOT_FOUND'), {
      status: getHttpStatusForError('NOT_FOUND'),
    });
  }

  return NextResponse.json({ invites });
}

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  const user = await getCurrentUserServer();
  if (!user) {
    return NextResponse.json(createAppError('UNAUTHORIZED'), {
      status: getHttpStatusForError('UNAUTHORIZED'),
    });
  }

  const event = getEventIfAuthorized(user.userId, context.params.id);
  if (!event) {
    return NextResponse.json(createAppError('NOT_FOUND'), {
      status: getHttpStatusForError('NOT_FOUND'),
    });
  }

  const contentType = request.headers.get('content-type') ?? '';
  let action = 'create';
  let recipientEmail = '';
  let roleGrant: EventRole = 'receptionist';
  let inviteId = '';

  if (contentType.includes('application/json')) {
    const body = (await request.json()) as Record<string, unknown>;
    action = String(body.action ?? 'create');
    recipientEmail = String(body.recipientEmail ?? '');
    roleGrant = (body.role as EventRole) ?? 'receptionist';
    inviteId = String(body.inviteId ?? '');
  } else {
    const formData = await request.formData();
    action = String(formData.get('action') ?? 'create');
    recipientEmail = String(formData.get('recipientEmail') ?? '');
    roleGrant = (formData.get('role') as EventRole) ?? 'receptionist';
    inviteId = String(formData.get('inviteId') ?? '');
  }

  if (action === 'revoke') {
    const revoked = revokeEventMemberInvite({
      actorUserId: user.userId,
      eventId: event.id,
      inviteId,
    });

    if (!revoked.ok) {
      return NextResponse.json(createAppError('FORBIDDEN', revoked.error), {
        status: getHttpStatusForError('FORBIDDEN'),
      });
    }

    if (!contentType.includes('application/json')) {
      return NextResponse.redirect(
        new URL(`/app/e/${event.id}/team?revoked=1`, request.url),
        303
      );
    }
    return NextResponse.json({ status: 'revoked' });
  }

  // Validasi tidak mengundang role lebih tinggi dari dirinya sendiri (PRD ORG-02)
  if (!canInviteWithEventRole(event.myEffectiveRole, roleGrant)) {
    const msg = 'Anda tidak dapat mengundang anggota dengan peran lebih tinggi dari hak akses Anda.';
    if (!contentType.includes('application/json')) {
      return NextResponse.redirect(
        new URL(`/app/e/${event.id}/team?error=${encodeURIComponent(msg)}`, request.url),
        303
      );
    }
    return NextResponse.json(createAppError('FORBIDDEN', msg), {
      status: getHttpStatusForError('FORBIDDEN'),
    });
  }

  const created = createEventMemberInvite({
    actorUserId: user.userId,
    eventId: event.id,
    recipientEmail,
    eventRoleGrant: roleGrant,
  });

  if ('error' in created) {
    return NextResponse.json(createAppError('FORBIDDEN', created.error), {
      status: getHttpStatusForError('FORBIDDEN'),
    });
  }

  if (!contentType.includes('application/json')) {
    return NextResponse.redirect(
      new URL(
        `/app/e/${event.id}/team?invited=${encodeURIComponent(created.invite.recipientEmail)}`,
        request.url
      ),
      303
    );
  }

  return NextResponse.json(created, { status: 201 });
}
