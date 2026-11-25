import { getDisplayScreenState } from '@/lib/db/repository';
import { LiveDisplayClient } from '@/components/display/live-display-client';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function FullscreenDisplayScreen({
  params: paramsPromise,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const params = await paramsPromise;

  const state = (await getDisplayScreenState(params.sessionId));
  if (!state) notFound();

  return (
    <LiveDisplayClient
      sessionId={params.sessionId}
      initialState={{
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
      }}
    />
  );
}
