import { routeError } from '@/lib/http';
import { NextResponse } from 'next/server';
import { getCurrentUserServer } from '@/lib/auth/session';
import { createAppError, getHttpStatusForError } from '@/lib/errors';
import { getEventIfAuthorized } from '@/lib/db/repository';
import { PLANS_CATALOG } from '@/lib/plans';

export async function GET(
  _request: Request,
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

  const event = (await getEventIfAuthorized(user.userId, params.id));
  if (!event) {
    // Kembalikan 404 agar tidak membocorkan keberadaan event milik tenant lain (PRD Bab 9 & TC-001)
    return NextResponse.json(createAppError('NOT_FOUND'), {
      status: getHttpStatusForError('NOT_FOUND'),
    });
  }

  return NextResponse.json({
    event,
    plan: PLANS_CATALOG[event.planCode],
  });

  } catch (error) { return routeError(error); }
}

