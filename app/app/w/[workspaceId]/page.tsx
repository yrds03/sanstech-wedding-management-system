import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import {
  getAuthorizedEventsForWorkspace,
  getAuthorizedWorkspacesForUser,
  getWorkspaceIfAuthorized,
} from '@/lib/db/repository';
import { AppShell } from '@/components/app/app-shell';
import { Badge, EmptyState, StatCard } from '@/components/ui/primitives';
import { formatEventDateId } from '@/lib/dates';

export default async function WorkspaceDashboardPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const user = await requireAuthenticatedUser(`/app/w/${params.workspaceId}`);
  const workspace = getWorkspaceIfAuthorized(user.userId, params.workspaceId);

  if (!workspace) {
    notFound();
  }

  const allWorkspaces = getAuthorizedWorkspacesForUser(user.userId);
  const events = getAuthorizedEventsForWorkspace(user.userId, workspace.id) ?? [];

  const totalInvitationGroups = events.reduce(
    (sum, ev) => sum + ev.metrics.invitationGroupsCount,
    0
  );
  const totalInvitedPersons = events.reduce(
    (sum, ev) => sum + ev.metrics.invitedCapacityTotal,
    0
  );

  return (
    <AppShell
      user={user}
      activeWorkspace={workspace}
      allWorkspaces={allWorkspaces}
      effectiveRole={workspace.role === 'owner' ? 'workspace_owner' : 'workspace_admin'}
    >
      <div className="space-y-8">
        {/* Header Dashboard WO / Personal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="gold">
                {workspace.type === 'wo' ? 'Dashboard Wedding Organizer' : 'Workspace Pengantin'}
              </Badge>
              <span className="text-xs text-ink/60">/{workspace.slug}</span>
            </div>
            <h1 className="mt-1.5 text-2xl font-bold text-navy">{workspace.name}</h1>
          </div>

          <Link
            href={`/app/w/${workspace.id}/events#buat-acara`}
            className="min-h-[44px] inline-flex items-center justify-center rounded-button bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-light transition"
          >
            + Buat Acara Pernikahan
          </Link>
        </div>

        {/* Kartu Ringkasan (S05) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Acara Aktif / Live"
            value={workspace.activeEventsCount}
            definition="Acara berstatus dipublikasikan atau sedang berlangsung hari-H."
            badgeText="Aktif"
            badgeVariant="success"
          />
          <StatCard
            label="Persiapan (Draft)"
            value={workspace.upcomingEventsCount}
            definition="Acara yang sedang disiapkan daftar tamu dan undangannya."
          />
          <StatCard
            label="Acara Selesai"
            value={workspace.completedEventsCount}
            definition="Acara yang telah selesai dan memiliki rekonsiliasi laporan."
          />
          <StatCard
            label="Total Undangan Terkelola"
            value={`${totalInvitationGroups} Grup`}
            definition={`Mewakili ${totalInvitedPersons.toLocaleString('id-ID')} kuota orang di seluruh acara workspace ini.`}
            badgeText="Agregat"
            badgeVariant="gold"
          />
        </div>

        {/* Tabel 5 Acara Terdekat (S05) */}
        <section className="rounded-card border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-navy">Daftar Acara Pernikahan</h2>
              <p className="text-xs text-ink/60">
                Menampilkan acara yang berada dalam isolasi workspace ini.
              </p>
            </div>
            <Link
              href={`/app/w/${workspace.id}/events`}
              className="text-xs font-semibold text-navy hover:underline"
            >
              Kelola &amp; Tambah Acara &rarr;
            </Link>
          </div>

          {events.length === 0 ? (
            <EmptyState
              title="Belum ada acara. Buat acara pertama."
              description="Tambahkan acara pernikahan klien atau acara pribadi Anda untuk mulai mengelola daftar tamu dan QR check-in."
              actionLabel="Buat Acara Pertama"
              actionHref={`/app/w/${workspace.id}/events#buat-acara`}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-ink/60">
                    <th className="py-3 pr-4">Nama Acara &amp; Pasangan</th>
                    <th className="py-3 px-4">Tanggal &amp; Waktu</th>
                    <th className="py-3 px-4">Lokasi / Kota</th>
                    <th className="py-3 px-4">Paket</th>
                    <th className="py-3 px-4">Undangan / Kuota</th>
                    <th className="py-3 pl-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {events.slice(0, 5).map((ev) => (
                    <tr key={ev.id} className="hover:bg-ivory/60">
                      <td className="py-3.5 pr-4">
                        <p className="font-bold text-navy">{ev.title}</p>
                        <p className="text-xs text-ink/60">
                          {ev.brideName} &amp; {ev.groomName}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <p className="font-medium text-ink">{formatEventDateId(ev.eventDate)}</p>
                        <p className="text-ink/60">
                          {ev.startTime}–{ev.endTime} ({ev.timezone})
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <p className="font-medium text-ink">{ev.venue}</p>
                        <p className="text-ink/60">{ev.city}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={ev.planCode === 'free' ? 'outline' : 'gold'}>
                          {ev.planCode.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-xs tabular-nums">
                        <strong>{ev.metrics.invitationGroupsCount}</strong> undangan (
                        {ev.metrics.invitedCapacityTotal} orang)
                      </td>
                      <td className="py-3.5 pl-4 text-right">
                        <Link
                          href={`/app/e/${ev.id}`}
                          className="inline-flex min-h-[36px] items-center rounded-button bg-navy px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-navy-light transition"
                        >
                          Buka Dashboard
                        </Link>
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
