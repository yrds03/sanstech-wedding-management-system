import { routeError } from '@/lib/http';
import { NextResponse } from 'next/server';
import { getDisplayScreenState } from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {

  const params = await context.params;

  const state = (await getDisplayScreenState(params.sessionId));
  if (!state) return NextResponse.json({error:{code:'NOT_FOUND',message:'Sesi layar tidak valid atau kedaluwarsa.'}},{status:404,headers:{'Cache-Control':'no-store'}});

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

  } catch (error) { return routeError(error); }
}

