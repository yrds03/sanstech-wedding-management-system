import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import {
  getAuthorizedWorkspacesForUser,
  getEventIfAuthorized,
  getWorkspaceIfAuthorized,
  listAuditLogsForEvent,
} from '@/lib/db/repository';
import { AppShell } from '@/components/app/app-shell';
import { Badge, StatCard } from '@/components/ui/primitives';
import { formatEventDateId } from '@/lib/dates';
import { hasPermission, ROLE_LABELS_ID } from '@/lib/permissions';
import { PLANS_CATALOG } from '@/lib/plans';

export default async function EventOverviewPage({
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
  const plan = PLANS_CATALOG[event.planCode];
  const auditLogs = listAuditLogsForEvent(user.userId, event.id);

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
        {/* Header Acara (S06) */}
        <div className="rounded-card border border-border bg-surface p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={event.status === 'published' ? 'success' : 'outline'}>
                Status: {event.status.toUpperCase()}
              </Badge>
              <Badge variant="gold">
                Paket {plan.displayName} (Maks. {plan.limits.maxInvitationGroups} Undangan)
              </Badge>
              <Badge variant="outline">
                Peran Anda: {ROLE_LABELS_ID[event.myEffectiveRole]}
              </Badge>
            </div>
            <h1 className="mt-2 font-serif text-2xl sm:text-3xl font-bold text-navy">
              {event.brideName} &amp; {event.groomName}
            </h1>
            <p className="mt-1 text-sm text-ink/75">
              {event.title} · {formatEventDateId(event.eventDate)} ({event.startTime}–
              {event.endTime} {event.timezone})
            </p>
            <p className="text-xs text-ink/60 mt-0.5">
              Lokasi: {event.venue}, {event.city} · Penyelenggara: {event.workspaceName}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {hasPermission(event.myEffectiveRole, 'event:manage_team') && (
              <Link
                href={`/app/e/${event.id}/team`}
                className="min-h-[42px] inline-flex items-center rounded-button border border-border bg-ivory px-4 py-2 text-xs font-semibold text-navy hover:bg-gold/15 transition"
              >
                Undang Pasangan / Petugas
              </Link>
            )}
            {hasPermission(event.myEffectiveRole, 'event:edit_details') && (
              <Link
                href={`/app/e/${event.id}/settings`}
                className="min-h-[42px] inline-flex items-center rounded-button bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-light transition"
              >
                Pengaturan Acara
              </Link>
            )}
          </div>
        </div>

        {/* 6 Kartu Metrik Eksplisit (Sesuai PRD FLOW-07 & S06: Membedakan Undangan vs Kuota Orang vs RSVP vs Hadir) */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-navy">
              Ringkasan Undangan, Rencana RSVP &amp; Kehadiran Aktual
            </h2>
            <span className="text-xs text-ink/60">
              *RSVP adalah rencana kehadiran, Check-in adalah kehadiran terkonfirmasi di hari-H.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              label="1. Jumlah Undangan (Grup)"
              value={event.metrics.invitationGroupsCount}
              definition={`Jumlah unit undangan unik (individu/pasangan/keluarga) dari kuota paket ${plan.limits.maxInvitationGroups}.`}
              badgeText={`Batas: ${plan.limits.maxInvitationGroups}`}
            />
            <StatCard
              label="2. Kuota Orang Diundang"
              value={event.metrics.invitedCapacityTotal}
              definition="Total kapasitas seluruh orang dari semua grup undangan yang terdaftar."
            />
            <StatCard
              label="3. Rencana Hadir (RSVP Orang)"
              value={event.metrics.rsvpAttendingCount}
              definition="Jumlah orang yang mengonfirmasi rencana hadir melalui tautan undangan publik."
              badgeText="Rencana"
              badgeVariant="gold"
            />
            <StatCard
              label="4. Tamu Hadir Aktual (Orang)"
              value={event.metrics.checkedInPersonsCount}
              definition="Total akumulasi peserta yang telah check-in pada buku besar (ledger) hari-H."
              badgeText="Hari-H"
              badgeVariant="success"
            />
            <StatCard
              label="5. Grup Undangan Hadir"
              value={event.metrics.checkedInGroupsCount}
              definition="Jumlah grup/keluarga yang minimal 1 anggotanya telah melakukan check-in."
            />
            <StatCard
              label="6. Kehadiran Tamu VIP & VVIP"
              value={`${event.metrics.vipCheckedInCount} / ${event.metrics.vipTotalCount}`}
              definition="Grup tamu kehormatan (VIP/VVIP) yang sudah tercatat hadir di lokasi acara."
              badgeText="Prioritas"
              badgeVariant="gold"
            />
          </div>
        </section>

        {/* Pintasan Modul Sprint 2–4 & Riwayat Audit */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-card border border-border bg-surface p-6 shadow-sm">
            <h2 className="text-base font-bold text-navy">Tahapan Persiapan &amp; Operasional</h2>
            <p className="text-xs text-ink/60 mt-1">
              Status modul berdasarkan tahapan pembangunan berurutan (Sprint 0–1 aktif):
            </p>

            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-center justify-between p-3 rounded-button bg-ivory">
                <div>
                  <p className="font-semibold text-navy">1. Pengaturan Acara &amp; Tim Kolaborator</p>
                  <p className="text-xs text-ink/65">
                    Kelola detail mempelai, jadwal, dan undang pasangan/staf.
                  </p>
                </div>
                <Badge variant="success">Aktif (Sprint 1)</Badge>
              </li>
              <li className="flex items-center justify-between p-3 rounded-button bg-ivory">
                <div>
                  <p className="font-semibold text-navy">2. Daftar Tamu, Import Excel &amp; QR Unik</p>
                  <p className="text-xs text-ink/65">
                    Input grup undangan, kapasitas keluarga, dan token QR terpisah.
                  </p>
                </div>
                <Badge variant="gold">Segera hadir (Sprint 2)</Badge>
              </li>
              <li className="flex items-center justify-between p-3 rounded-button bg-ivory">
                <div>
                  <p className="font-semibold text-navy">3. Scanner Check-in Atomik &amp; Laporan</p>
                  <p className="text-xs text-ink/65">
                    Scan kamera HP, kedatangan parsial, koreksi supervisor.
                  </p>
                </div>
                <Badge variant="gold">Segera hadir (Sprint 3)</Badge>
              </li>
            </ul>
          </section>

          {/* Riwayat Audit Log (S1-07 / AUD-01) */}
          <section className="rounded-card border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-navy">Jeja Audit Keamanan (Audit Log)</h2>
              <Badge variant="outline">Server-Authoritative</Badge>
            </div>
            <p className="text-xs text-ink/60 mb-4">
              Setiap perubahan pengaturan acara, undangan anggota tim, dan pencabutan akses dicatat
              secara permanen.
            </p>

            {auditLogs.length === 0 ? (
              <p className="text-xs text-ink/50 italic">Belum ada catatan aktivitas.</p>
            ) : (
              <ul className="space-y-3">
                {auditLogs.slice(0, 5).map((log) => (
                  <li
                    key={log.id}
                    className="rounded-button border border-border bg-ivory/60 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between font-semibold text-navy">
                      <span>{log.action}</span>
                      <span className="text-[11px] font-normal text-ink/60">
                        {new Date(log.createdAt).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <p className="mt-1 text-ink/80">{log.summary}</p>
                    <p className="mt-1 text-[11px] text-ink/55">Pelaku: {log.actorName}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

