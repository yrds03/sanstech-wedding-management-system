import { NextResponse } from 'next/server';
import { getDisplayScreenState } from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: { sessionId: string } }
) {
  const state = getDisplayScreenState(context.params.sessionId);

  return NextResponse.json({
    eventTitle: state.event.title,
    brideName: state.event.brideName,
    groomName: state.event.groomName,
    venue: state.event.venue,
    totalCheckedInPersons: state.totalCheckedInPersons,
    welcomeGuest: state.latestPublicWelcome
      ? {
          id: state.latestPublicWelcome.id,
          displayName: state.latestPublicWelcome.displayName,
          guestCategory: state.latestPublicWelcome.guestCategory,
          tableLabelOptional: state.latestPublicWelcome.tableLabelOptional ?? null,
        }
      : null,
    lastUpdatedIso: state.lastUpdatedIso,
  });
}

