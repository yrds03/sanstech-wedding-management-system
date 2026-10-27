import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import {
  getAuthorizedWorkspacesForUser,
  getEventIfAuthorized,
  getWorkspaceIfAuthorized,
} from '@/lib/db/repository';
import { AppShell } from '@/components/app/app-shell';
import { Badge } from '@/components/ui/primitives';

export function createSprintPlaceholderPage(config: {
  title: string;
  sprintBadge: string;
  description: string;
  upcomingFeatures: string[];
}) {
  return async function SprintModulePlaceholder({
    params,
  }: {
    params: { eventId: string };
  }) {
    const user = await requireAuthenticatedUser(`/app/e/${params.eventId}`);
    const event = getEventIfAuthorized(user.userId, params.eventId);

    if (!event) {
      notFound();
    }

    const allWorkspaces = getAuthorizedWorkspacesForUser(user.userId);
    const activeWorkspace = getWorkspaceIfAuthorized(user.userId, event.workspaceId);

    return (
      <AppShell
        user={user}
        activeWorkspace={activeWorkspace}
        allWorkspaces={allWorkspaces}
        effectiveRole={event.myEffectiveRole}
        eventId={event.id}
        eventTitle={event.title}
      >
        <div className="max-w-2xl rounded-card border border-border bg-surface p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="gold">Segera hadir — {config.sprintBadge}</Badge>
            <Badge variant="outline">{event.title}</Badge>
          </div>
          <h1 className="text-2xl font-bold text-navy">{config.title}</h1>
          <p className="text-sm text-ink/75 leading-relaxed">{config.description}</p>

          <div className="rounded-button bg-ivory p-4 border border-border">
            <p className="text-xs font-bold uppercase tracking-wider text-navy mb-2">
              Spesifikasi yang Akan Diaktifkan pada {config.sprintBadge}:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-ink/80">
              {config.upcomingFeatures.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="pt-2">
            <Link
              href={`/app/e/${event.id}`}
              className="min-h-[42px] inline-flex items-center rounded-button bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-light transition"
            >
              &larr; Kembali ke Ringkasan Acara
            </Link>
          </div>
        </div>
      </AppShell>
    );
  };
}
