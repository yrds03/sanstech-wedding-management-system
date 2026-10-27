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
import { evaluateEventPostLifecycle, getPlansCatalog } from '@/lib/plans';

export const dynamic = 'force-dynamic';

export default async function EventOverviewPage({
  params,
  searchParams,
}: {
  params: { eventId: string };
  searchParams?: { reset_notice?: string; error?: string };
}) {
  const user = await requireAuthenticatedUser(`/app/e/${params.eventId}`);
  const event = getEventIfAuthorized(user.userId, params.eventId);

  if (!event) {
    notFound();
  }

  const allWorkspaces = getAuthorizedWorkspacesForUser(user.userId);
  const activeWorkspace = getWorkspaceIfAuthorized(user.userId, event.workspaceId);
  const catalog = getPlansCatalog();
  const plan = catalog[event.planCode];
  const lifecycle = evaluateEventPostLifecycle({
    eventDate: event.eventDate,
    planCode: event.planCode,
  });
  const auditLogs = listAuditLogsForEvent(user.userId, event.id);

  const canResetTesting =
    event.myEffectiveRole === 'workspace_owner' ||
    event.myEffectiveRole === 'workspace_admin' ||
    event.myEffectiveRole === 'event_manager' ||
    event.myEffectiveRole === 'platform_admin';

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
        {searchParams?.reset_notice && (
          <div className="rounded-button border border-success/40 bg-success/10 p-4 text-xs font-bold text-success">
            ✓ {searchParams.reset_notice}
          </div>
        )}

        {searchParams?.error && (
          <div className="rounded-button border border-danger/40 bg-danger/10 p-4 text-xs font-bold text-danger">
            {searchParams.error}
          </div>
        )}

        {/* Header Acara Luxury (S06) */}
        <div className="rounded-card border-2 border-gold/35 bg-gradient-to-r from-navy-dark via-navy to-navy-light text-ivory p-6 sm:p-8 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="gold">
                {plan.displayName} ({plan.priceLabel})
              </Badge>
              <Badge
                variant={
                  lifecycle.phase === 'expired_locked'
                    ? 'danger'
                    : lifecycle.phase === 'grace_period_readonly'
                    ? 'warning'
                    : 'success'
                }
              >
                {lifecycle.badgeLabelId}
              </Badge>
              <Badge variant="outline" className="bg-navy-dark/80 text-ivory border-gold/40">
                Peran: {ROLE_LABELS_ID[event.myEffectiveRole]}
              </Badge>
            </div>
            <h1 className="mt-3 font-serif text-3xl sm:text-4xl font-bold text-white tracking-wide">
              {event.brideName} &amp; {event.groomName}
            </h1>
            <p className="mt-1 text-sm text-gold-light font-medium">
              {event.title} · {formatEventDateId(event.eventDate)} ({event.startTime}–
              {event.endTime} {event.timezone})
            </p>
            <p className="text-xs text-ivory/75 mt-1">
              Lokasi: {event.venue}, {event.city} · Dikelola oleh: {event.workspaceName}
            </p>
            <p className="text-[11px] text-ivory/65 mt-2 bg-navy-dark/50 inline-block px-3 py-1 rounded border border-gold/25">
              ⏳ <strong>Status Masa Aktif Akun:</strong> {lifecycle.explanationId}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {hasPermission(event.myEffectiveRole, 'event:scan_checkin') && (
              <Link
                href={`/app/e/${event.id}/checkin`}
                className="min-h-[44px] inline-flex items-center rounded-button bg-gold px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-navy-dark shadow hover:bg-gold-light transition"
              >
                📷 Buka Scanner Hari-H
              </Link>
            )}
            {hasPermission(event.myEffectiveRole, 'event:manage_guests') && (
              <Link
                href={`/app/e/${event.id}/guests`}
                className="min-h-[44px] inline-flex items-center rounded-button border border-gold/50 bg-navy-dark/70 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gold-light hover:bg-navy-dark transition"
              >
                Kelola Daftar Tamu
              </Link>
            )}
          </div>
        </div>

        {/* 6 Kartu Metrik Eksplisit */}
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-xl font-bold text-navy">
              Ringkasan Eksekutif Undangan, RSVP &amp; Kehadiran Aktual
            </h2>
            <span className="text-xs text-ink/60">
              *RSVP adalah rencana kehadiran, Check-in adalah kehadiran sah di meja registrasi.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              label="1. Jumlah Undangan (Grup)"
              value={event.metrics.invitationGroupsCount}
              definition={`Unit undangan unik (individu/pasangan/keluarga) dari kuota ${plan.limits.maxInvitationGroups} grup.`}
              badgeText={`Batas: ${plan.limits.maxInvitationGroups}`}
            />
            <StatCard
              label="2. Kuota Orang Diundang"
              value={event.metrics.invitedCapacityTotal}
              definition="Total akumulasi kapasitas seluruh orang dari semua grup undangan."
            />
            <StatCard
              label="3. Rencana Hadir (RSVP Orang)"
              value={event.metrics.rsvpAttendingCount}
              definition="Jumlah orang yang mengonfirmasi rencana hadir pada halaman undangan."
              badgeText="Rencana"
              badgeVariant="gold"
            />
            <StatCard
              label="4. Tamu Hadir Aktual (Orang)"
              value={event.metrics.checkedInPersonsCount}
              definition="Total peserta yang sudah melakukan check-in pada buku besar (ledger) Hari-H."
              badgeText="Hari-H"
              badgeVariant="success"
            />
            <StatCard
              label="5. Grup Undangan Hadir"
              value={event.metrics.checkedInGroupsCount}
              definition="Jumlah grup/keluarga yang minimal 1 anggotanya telah tercatat hadir."
            />
            <StatCard
              label="6. Kehadiran Tamu VIP & VVIP"
              value={`${event.metrics.vipCheckedInCount} / ${event.metrics.vipTotalCount}`}
              definition="Tamu kehormatan (VIP/VVIP) yang telah tiba di lokasi resepsi."
              badgeText="Prioritas"
              badgeVariant="gold"
            />
          </div>
        </section>

        {/* Panel Khusus Reset / Hapus Data Testing (Menjawab Pertanyaan 5 User) */}
        {canResetTesting && (
          <section className="rounded-card border-2 border-gold/40 bg-surface p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <Badge variant="gold">KONTROL SIMULASI &amp; PEMBERSIHAN DATA TESTING</Badge>
                <h2 className="mt-2 font-serif text-xl font-bold text-navy">
                  Selesai Latihan Tim WO? Bersihkan Data Testing Dengan 1 Klik
                </h2>
                <p className="mt-1 text-xs text-ink/70 max-w-2xl leading-relaxed">
                  Saat Anda selesai melakukan simulasi/testing bersama tim WO, gunakan tombol di
                  samping untuk mengembalikan angka check-in ke <strong>0</strong> atau menghapus
                  seluruh tamu contoh agar acara siap diisi daftar tamu asli klien.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <form action={`/api/events/${event.id}/testing-reset`} method="POST">
                  <input type="hidden" name="mode" value="reset_checkins_only" />
                  <input type="hidden" name="returnTo" value={`/app/e/${event.id}`} />
                  <button
                    type="submit"
                    className="min-h-[42px] rounded-button border border-navy bg-ivory px-4 py-2 text-xs font-bold text-navy hover:bg-gold/15 transition"
                  >
                    🔄 Reset Angka Check-in ke 0 (Tamu Tetap Ada)
                  </button>
                </form>

                <form action={`/api/events/${event.id}/testing-reset`} method="POST">
                  <input type="hidden" name="mode" value="delete_all_test_guests" />
                  <input type="hidden" name="returnTo" value={`/app/e/${event.id}`} />
                  <button
                    type="submit"
                    className="min-h-[42px] rounded-button border border-danger/40 bg-danger/10 px-4 py-2 text-xs font-bold text-danger hover:bg-danger hover:text-white transition"
                  >
                    🗑️ Hapus Semua Tamu Testing (Bersih 0 Tamu)
                  </button>
                </form>

                <form action={`/api/events/${event.id}/testing-reset`} method="POST">
                  <input type="hidden" name="mode" value="restore_demo_samples" />
                  <input type="hidden" name="returnTo" value={`/app/e/${event.id}`} />
                  <button
                    type="submit"
                    className="min-h-[42px] rounded-button bg-navy px-4 py-2 text-xs font-bold text-gold-light hover:bg-navy-light transition"
                  >
                    + Muat Ulang 3 Tamu Contoh
                  </button>
                </form>
              </div>
            </div>
          </section>
        )}

        {/* Pintasan Cepat Semua Modul Aktif & Audit Log */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-card border border-gold/30 bg-surface p-6 shadow-sm">
            <h2 className="font-serif text-xl font-bold text-navy">
              Pintasan Operasional Acara (Semua Modul Aktif)
            </h2>
            <p className="text-xs text-ink/60 mt-1">
              Klik modul di bawah ini untuk langsung menguji perjalanan tamu dari hulu ke hilir:
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <Link
                href={`/app/e/${event.id}/guests`}
                className="rounded-button border border-border bg-ivory/60 p-3.5 hover:border-gold hover:bg-surface transition"
              >
                <p className="font-bold text-navy">1. Daftar Tamu &amp; Import CSV</p>
                <p className="text-ink/65 mt-0.5">Tambah tamu, kuota keluarga &amp; meja VIP.</p>
              </Link>

              <Link
                href={`/app/e/${event.id}/invitations`}
                className="rounded-button border border-border bg-ivory/60 p-3.5 hover:border-gold hover:bg-surface transition"
              >
                <p className="font-bold text-navy">2. Undangan Digital &amp; QR</p>
                <p className="text-ink/65 mt-0.5">Salin link tamu, uji RSVP &amp; share WA.</p>
              </Link>

              <Link
                href={`/app/e/${event.id}/checkin`}
                className="rounded-button border border-border bg-ivory/60 p-3.5 hover:border-gold hover:bg-surface transition"
              >
                <p className="font-bold text-navy">3. Scanner &amp; Check-in Hari-H</p>
                <p className="text-ink/65 mt-0.5">Scan QR, hadir parsial &amp; koreksi supervisor.</p>
              </Link>

              <Link
                href={`/app/e/${event.id}/vip`}
                className="rounded-button border border-border bg-ivory/60 p-3.5 hover:border-gold hover:bg-surface transition"
              >
                <p className="font-bold text-navy">4. Protokol VIP &amp; Tim Usher</p>
                <p className="text-ink/65 mt-0.5">Pantau kedatangan VVIP &amp; penjemputan.</p>
              </Link>

              <Link
                href={`/app/e/${event.id}/display`}
                className="rounded-button border border-border bg-ivory/60 p-3.5 hover:border-gold hover:bg-surface transition"
              >
                <p className="font-bold text-navy">5. Layar Sambutan TV Ballroom</p>
                <p className="text-ink/65 mt-0.5">Buka tampilan layar penuh 16:9 untuk TV.</p>
              </Link>

              <Link
                href={`/app/e/${event.id}/reports`}
                className="rounded-button border border-border bg-ivory/60 p-3.5 hover:border-gold hover:bg-surface transition"
              >
                <p className="font-bold text-navy">6. Laporan &amp; Unduh CSV Excel</p>
                <p className="text-ink/65 mt-0.5">Rekapitulasi akhir &amp; ekspor data aman.</p>
              </Link>
            </div>
          </section>

          {/* Riwayat Audit Log */}
          <section className="rounded-card border border-gold/30 bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-serif text-xl font-bold text-navy">
                Jejak Audit Keamanan (Audit Log)
              </h2>
              <Badge variant="outline">Immutable</Badge>
            </div>
            <p className="text-xs text-ink/60 mb-4">
              Mencatat setiap penambahan tamu, check-in, koreksi supervisor, dan reset data testing.
            </p>

            {auditLogs.length === 0 ? (
              <p className="text-xs text-ink/50 italic">Belum ada catatan aktivitas.</p>
            ) : (
              <ul className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {auditLogs.slice(0, 8).map((log) => (
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
