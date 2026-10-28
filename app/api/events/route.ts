import { NextResponse } from 'next/server';
import { getCurrentUserServer } from '@/lib/auth/session';
import { createAppError, getHttpStatusForError } from '@/lib/errors';
import { createOrUpdateEventSchema } from '@/lib/validators';
import { createEventInWorkspace, updateEventDetails } from '@/lib/db/repository';
import { PlanCode } from '@/lib/types';

export async function POST(request: Request) {
  const user = await getCurrentUserServer();
  if (!user) {
    return NextResponse.json(createAppError('UNAUTHORIZED'), {
      status: getHttpStatusForError('UNAUTHORIZED'),
    });
  }

  const contentType = request.headers.get('content-type') ?? '';
  let rawPayload: Record<string, unknown> = {};
  let mode = 'create';
  let eventIdToUpdate = '';
  let planCode: PlanCode = 'pro_plus';

  if (contentType.includes('application/json')) {
    rawPayload = (await request.json()) as Record<string, unknown>;
    mode = String(rawPayload.mode ?? 'create');
    eventIdToUpdate = String(rawPayload.eventId ?? '');
    if (rawPayload.planCode === 'free' || rawPayload.planCode === 'pro' || rawPayload.planCode === 'pro_plus') {
      planCode = rawPayload.planCode;
    }
  } else {
    const formData = await request.formData();
    mode = String(formData.get('mode') ?? 'create');
    eventIdToUpdate = String(formData.get('eventId') ?? '');
    const rawPlan = String(formData.get('planCode') ?? 'pro_plus');
    if (rawPlan === 'free' || rawPlan === 'pro' || rawPlan === 'pro_plus') {
      planCode = rawPlan;
    }
    rawPayload = {
      workspaceId: String(formData.get('workspaceId') ?? ''),
      title: String(formData.get('title') ?? ''),
      brideName: String(formData.get('brideName') ?? ''),
      groomName: String(formData.get('groomName') ?? ''),
      eventDate: String(formData.get('eventDate') ?? ''),
      startTime: String(formData.get('startTime') ?? '09:00'),
      endTime: String(formData.get('endTime') ?? '13:00'),
      timezone: String(formData.get('timezone') ?? 'Asia/Jakarta'),
      venue: String(formData.get('venue') ?? ''),
      city: String(formData.get('city') ?? ''),
      address: String(formData.get('address') ?? ''),
      status: String(formData.get('status') ?? 'published'),
    };
  }

  const parsed = createOrUpdateEventSchema.safeParse(rawPayload);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? 'Detail acara belum valid.';
    if (!contentType.includes('application/json')) {
      const backUrl =
        mode === 'update' && eventIdToUpdate
          ? `/app/e/${eventIdToUpdate}/settings?error=${encodeURIComponent(firstIssue)}`
          : `/app/w/${String(rawPayload.workspaceId)}/events?error=${encodeURIComponent(firstIssue)}`;
      return NextResponse.redirect(new URL(backUrl, request.url), 303);
    }
    return NextResponse.json(createAppError('VALIDATION_ERROR', firstIssue), {
      status: getHttpStatusForError('VALIDATION_ERROR'),
    });
  }

  if (mode === 'update' && eventIdToUpdate) {
    const updated = updateEventDetails({
      userId: user.userId,
      eventId: eventIdToUpdate,
      ...parsed.data,
    });

    if ('error' in updated) {
      if (!contentType.includes('application/json')) {
        return NextResponse.redirect(
          new URL(
            `/app/e/${eventIdToUpdate}/settings?error=${encodeURIComponent(updated.error)}`,
            request.url
          ),
          303
        );
      }
      return NextResponse.json(createAppError('FORBIDDEN', updated.error), {
        status: getHttpStatusForError('FORBIDDEN'),
      });
    }

    if (!contentType.includes('application/json')) {
      return NextResponse.redirect(
        new URL(`/app/e/${eventIdToUpdate}/settings?saved=1`, request.url),
        303
      );
    }
    return NextResponse.json({ event: updated });
  }

  const created = createEventInWorkspace({
    userId: user.userId,
    planCode,
    ...parsed.data,
  });

  if ('error' in created) {
    return NextResponse.json(createAppError('FORBIDDEN', created.error), {
      status: getHttpStatusForError('FORBIDDEN'),
    });
  }

  if (!contentType.includes('application/json')) {
    return NextResponse.redirect(new URL(`/app/e/${created.id}`, request.url), 303);
  }

  return NextResponse.json({ event: created }, { status: 201 });
}

