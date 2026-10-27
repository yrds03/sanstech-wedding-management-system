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
import { Badge, StatCard } from '@/components/ui/primitives';

export const dynamic = 'force-dynamic';

export default async function EventReportsPage({
  params,
}: {
  params: { eventId: string };
}) {
  const user = await requireAuthenticatedUser(`/app/e/${params.eventId}/reports`);
  const event = getEventIfAuthorized(user.userId, params.eventId);

  if (!event) {
    notFound();
  }

  const allWorkspaces = getAuthorizedWorkspacesForUser(user.userId);
  const activeWorkspace = getWorkspaceIfAuthorized(user.userId, event.workspaceId);
  const groups = listInvitationGroupsForEvent(user.userId, event.id) ?? [];
  const ledger = listCheckinLedgerForEvent(user.userId, event.id) ?? [];

  const noShowGroupsCount = Math.max(
    0,
    event.metrics.invitationGroupsCount - event.metrics.checkedInGroupsCount
  );

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
            <Badge variant="gold">LAPORAN REKONSILIASI AKHIR ACARA (S18)</Badge>
            <h1 className="mt-2 font-serif text-3xl font-bold text-navy">
              Laporan Kehadiran &amp; Ekspor Data Klien
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-ink/70">
              Seluruh angka dihitung langsung dari buku besar check-in (termasuk koreksi
              supervisor) dan dilengkapi sanitasi anti Formula Injection saat diekspor ke Excel.
            </p>
          </div>

          <a
            href={`/api/events/${event.id}/reports/export`}
            className="min-h-[44px] inline-flex items-center justify-center rounded-button bg-navy border border-gold/50 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-gold-light shadow hover:bg-navy-light transition"
          >
            ðŸ“¥ Download Laporan CSV / Excel
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Grup Undangan"
            value={event.metrics.invitationGroupsCount}
            definition={`Kuota total ${event.metrics.invitedCapacityTotal} orang diundang.`}
          />
          <StatCard
            label="Rencana Hadir (RSVP)"
            value={`${event.metrics.rsvpAttendingCount} Orang`}
            definition="Konfirmasi kehadiran sebelum acara."
            badgeText="RSVP"
            badgeVariant="gold"
          />
          <StatCard
            label="Hadir Aktual Hari-H"
            value={`${event.metrics.checkedInPersonsCount} Orang`}
            definition={`Berasal dari ${event.metrics.checkedInGroupsCount} grup undangan yang hadir.`}
            badgeText="Sah"
            badgeVariant="success"
          />
          <StatCard
            label="Grup Belum Hadir (No-Show)"
            value={`${noShowGroupsCount} Grup`}
            definition="Grup undangan yang belum melakukan scan check-in."
          />
        </div>

        {/* Tabel Rekapitulasi Per Grup */}
        <section className="rounded-card border border-gold/30 bg-surface p-6 shadow-sm">
          <h2 className="font-serif text-xl font-bold text-navy mb-4">
            Rekapitulasi Kehadiran Per Grup Undangan ({groups.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase text-ink/60">
                  <th className="py-3 pr-3">Nama Penerima</th>
                  <th className="py-3 px-3">Kategori</th>
                  <th className="py-3 px-3">Meja</th>
                  <th className="py-3 px-3">Kuota</th>
                  <th className="py-3 px-3">RSVP</th>
                  <th className="py-3 pl-3 text-right">Hadir Aktual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {groups.map((g) => (
                  <tr key={g.id} className="hover:bg-ivory/50">
                    <td className="py-3 pr-3 font-bold text-navy">{g.displayName}</td>
                    <td className="py-3 px-3">
                      <Badge variant={g.guestCategory === 'regular' ? 'outline' : 'gold'}>
                        {g.guestCategory.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-xs">{g.tableLabelOptional ?? 'â€”'}</td>
                    <td className="py-3 px-3 tabular-nums">{g.capacity} org</td>
                    <td className="py-3 px-3 tabular-nums">{g.rsvpCount} org</td>
                    <td className="py-3 pl-3 text-right font-bold tabular-nums text-navy">
                      {g.checkedInCount} / {g.capacity} org
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Tabel Ledger Riwayat */}
        <section className="rounded-card border border-gold/30 bg-surface p-6 shadow-sm">
          <h2 className="font-serif text-xl font-bold text-navy mb-4">
            Log Transaksi &amp; Koreksi Kehadiran ({ledger.length})
          </h2>
          {ledger.length === 0 ? (
            <p className="text-xs text-ink/60 italic">Belum ada transaksi check-in tercatat.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border uppercase text-ink/60">
                    <th className="py-2.5 pr-3">Waktu</th>
                    <th className="py-2.5 px-3">Nama Tamu</th>
                    <th className="py-2.5 px-3">Metode</th>
                    <th className="py-2.5 px-3">Petugas / Actor</th>
                    <th className="py-2.5 px-3">Catatan / Alasan Koreksi</th>
                    <th className="py-2.5 pl-3 text-right">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ledger.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 pr-3 text-ink/65">
                        {new Date(item.createdAt).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-navy">{item.guestDisplayName}</td>
                      <td className="py-2.5 px-3 uppercase">{item.method}</td>
                      <td className="py-2.5 px-3">{item.actorName}</td>
                      <td className="py-2.5 px-3 text-ink/70">{item.reasonNullable ?? 'â€”'}</td>
                      <td className="py-2.5 pl-3 text-right font-bold tabular-nums">
                        {item.deltaAttendees > 0
                          ? `+${item.deltaAttendees}`
                          : item.deltaAttendees}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
