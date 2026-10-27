import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import {
  getAuthorizedWorkspacesForUser,
  getEventIfAuthorized,
  getWorkspaceIfAuthorized,
  listCheckinLedgerForEvent,
  listInvitationGroupsForEvent,
} from '@/lib/db/repository';
import { AppShell } from '@/components/app/app-shell';
import { Badge } from '@/components/ui/primitives';

export const dynamic = 'force-dynamic';

export default async function EventDisplayConfigPage({
  params,
}: {
  params: { eventId: string };
}) {
  const user = await requireAuthenticatedUser(`/app/e/${params.eventId}/display`);
  const event = getEventIfAuthorized(user.userId, params.eventId);

  if (!event) {
    notFound();
  }

  const allWorkspaces = getAuthorizedWorkspacesForUser(user.userId);
  const activeWorkspace = getWorkspaceIfAuthorized(user.userId, event.workspaceId);
  const groups = listInvitationGroupsForEvent(user.userId, event.id) ?? [];
  const ledger = listCheckinLedgerForEvent(user.userId, event.id) ?? [];

  // Cari tamu terakhir yang check-in dan mengizinkan namanya tampil di layar publik
  const latestPublicWelcome = ledger
    .filter((l) => l.deltaAttendees > 0)
    .map((l) => groups.find((g) => g.id === l.invitationGroupId))
    .find((g) => g && g.allowedPublicDisplay);

  return (
    <AppShell
      user={user}
      activeWorkspace={activeWorkspace}
      allWorkspaces={allWorkspaces}
      effectiveRole={event.myEffectiveRole}
      eventId={event.id}
      eventTitle={event.title}
    >
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Badge variant="gold">LAYAR SAMBUTAN TV / LED BALLROOM (S16 &amp; S17)</Badge>
            <h1 className="mt-2 font-serif text-3xl font-bold text-navy">
              Pratinjau &amp; Pairing Layar Sambutan Real-Time
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-ink/70 max-w-2xl">
              Hubungkan Smart TV atau LED Ballroom ke halaman layar penuh. Nama tamu hanya muncul
              apabila opsi <code>allowed_public_display</code> diizinkan pada data tamu tersebut.
            </p>
          </div>

          <Link
            href={`/display/${event.id}`}
            target="_blank"
            className="min-h-[46px] inline-flex items-center justify-center rounded-button bg-navy border border-gold/50 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-gold-light shadow hover:bg-navy-light transition"
          >
            📺 Buka Layar Penuh TV (16:9) di Tab Baru &rarr;
          </Link>
        </div>

        {/* Simulasi Pratinjau 16:9 */}
        <section className="rounded-card border-4 border-gold/60 bg-gradient-to-b from-navy-dark via-navy to-navy-dark text-ivory p-10 sm:p-16 text-center shadow-2xl">
          <p className="text-xs uppercase tracking-[0.35em] text-gold-light">
            THE ROYAL WEDDING RECEPTION OF
          </p>
          <h2 className="mt-3 font-serif text-4xl sm:text-6xl font-bold text-white tracking-wide">
            {event.brideName} &amp; {event.groomName}
          </h2>
          <div className="my-6 h-px w-36 bg-gold/50 mx-auto" />

          {latestPublicWelcome ? (
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.25em] text-ivory/80">
                Selamat Datang Kehormatan
              </p>
              <p className="font-serif text-3xl sm:text-5xl font-bold text-gold-light">
                {latestPublicWelcome.displayName}
              </p>
              {latestPublicWelcome.tableLabelOptional && (
                <p className="text-sm sm:text-base text-ivory/90 font-medium mt-2">
                  Silakan Menuju {latestPublicWelcome.tableLabelOptional}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="font-serif italic text-2xl sm:text-3xl text-gold-light">
                Selamat Datang Bapak/Ibu/Saudara/i Tamu Undangan
              </p>
              <p className="text-xs text-ivory/70">
                Terima kasih atas kehadiran dan doa restu Anda di {event.venue}
              </p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
