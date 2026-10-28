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
import { hasPermission } from '@/lib/permissions';
import { CameraQrScanner } from '@/components/checkin/camera-qr-scanner';

export const dynamic = 'force-dynamic';

export default async function EventCheckinScannerPage({
  params,
  searchParams,
}: {
  params: { eventId: string };
  searchParams?: {
    prefill?: string;
    success?: string;
    reset_notice?: string;
    error?: string;
  };
}) {
  const user = await requireAuthenticatedUser(`/app/e/${params.eventId}/checkin`);
  const event = getEventIfAuthorized(user.userId, params.eventId);

  if (!event) {
    notFound();
  }

  const allWorkspaces = getAuthorizedWorkspacesForUser(user.userId);
  const activeWorkspace = getWorkspaceIfAuthorized(user.userId, event.workspaceId);
  const groups = listInvitationGroupsForEvent(user.userId, event.id) ?? [];
  const ledger = listCheckinLedgerForEvent(user.userId, event.id) ?? [];
  const canCorrect = hasPermission(event.myEffectiveRole, 'event:correct_checkin');
  const idempotencyKey = crypto.randomUUID();

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
        {/* Header Konsol Scanner Hari-H */}
        <div className="rounded-card border-2 border-gold/40 bg-navy-dark text-ivory p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="success">● ONLINE — TRANSAKSI ATOMIK AKTIF</Badge>
              <Badge variant="gold">
                Hadir: {event.metrics.checkedInPersonsCount} / {event.metrics.invitedCapacityTotal}{' '}
                Orang
              </Badge>
            </div>
            <h1 className="mt-2 font-serif text-2xl sm:text-3xl font-bold text-white">
              Konsol Scanner QR &amp; Penerimaan Tamu Hari-H (S12 / S13 / S14)
            </h1>
            <p className="text-xs text-ivory/75 mt-1">
              Mendukung kedatangan keluarga bertahap (parsial), pencegahan scan ganda, pencarian
              manual, dan koreksi supervisor ter-audit.
            </p>
          </div>

          <form action={`/api/events/${event.id}/testing-reset`} method="POST">
            <input type="hidden" name="mode" value="reset_checkins_only" />
            <input type="hidden" name="returnTo" value={`/app/e/${event.id}/checkin`} />
            <button
              type="submit"
              className="min-h-[40px] rounded-button border border-gold/40 bg-navy px-4 py-2 text-xs font-bold text-gold-light hover:bg-navy-light transition"
            >
              🔄 Reset Simulasi Check-in ke 0
            </button>
          </form>
        </div>

        {searchParams?.success && (
          <div className="rounded-button border-2 border-success bg-success/15 p-4 text-sm font-bold text-success shadow-sm">
            ✓ {searchParams.success}
          </div>
        )}

        {searchParams?.reset_notice && (
          <div className="rounded-button border border-success/40 bg-success/10 p-4 text-xs font-bold text-success">
            ✓ {searchParams.reset_notice}
          </div>
        )}

        {searchParams?.error && (
          <div className="rounded-button border-2 border-danger bg-danger/15 p-4 text-sm font-bold text-danger shadow-sm">
            ⚠ {searchParams.error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
          {/* 1. Scan Kode QR / Input Token QR */}
          <section className="rounded-card border border-gold/30 bg-surface p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold text-navy">
                1. Scan QR Code Tamu (S12 &amp; S13)
              </h2>
              <Badge variant="gold">Anti-Scan Ganda</Badge>
            </div>
            <p className="text-xs text-ink/70">
              Arahkan scanner barcode/kamera atau pilih kode QR tamu di bawah untuk mengonfirmasi
              jumlah orang yang datang:
            </p>

            <CameraQrScanner
              eventId={event.id}
              initialToken={searchParams?.prefill ?? ''}
              idempotencyKey={idempotencyKey}
              groups={groups.map((g) => ({
                id: g.id,
                displayName: g.displayName,
                qrTokenPreview: g.qrTokenPreview,
                guestCategory: g.guestCategory,
                capacity: g.capacity,
                checkedInCount: g.checkedInCount,
                remainingCapacity: g.remainingCapacity,
                tableLabelOptional: g.tableLabelOptional,
              }))}
            />

            {/* Daftar Cepat Klik Simulasi QR */}
            <div className="pt-2">
              <p className="text-xs font-bold text-navy mb-2">
                Klik Cepat Pilih Tamu (Pencarian Manual S14):
              </p>
              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {groups.map((g) => (
                  <div
                    key={g.id}
                    className="rounded-button border border-border bg-surface p-3 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <p className="font-bold text-navy">
                        {g.displayName}{' '}
                        <span className="text-gold-dark">({g.guestCategory.toUpperCase()})</span>
                      </p>
                      <p className="text-[11px] text-ink/60 tabular-nums">
                        Kode: <code>{g.qrTokenPreview}</code> · Kuota {g.capacity} · Hadir{' '}
                        <strong>{g.checkedInCount}</strong> · Sisa{' '}
                        <strong>{g.remainingCapacity}</strong>
                      </p>
                    </div>

                    <form action={`/api/events/${event.id}/checkins`} method="POST">
                      <input type="hidden" name="method" value="manual" />
                      <input type="hidden" name="groupIdOrQrToken" value={g.id} />
                      <input type="hidden" name="deltaAttendees" value={1} />
                      <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
                      <button
                        type="submit"
                        disabled={g.remainingCapacity <= 0}
                        className={`rounded-button px-3 py-1.5 font-bold transition ${
                          g.remainingCapacity <= 0
                            ? 'bg-border text-ink/40 cursor-not-allowed'
                            : 'bg-success text-white hover:opacity-90'
                        }`}
                      >
                        {g.remainingCapacity <= 0 ? 'Kuota Penuh' : '+1 Hadir Manual'}
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 2. Koreksi Supervisor & Buku Besar Hari-H */}
          <section className="space-y-6">
            {canCorrect && (
              <div className="rounded-card border border-gold/30 bg-surface p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-serif text-xl font-bold text-navy">
                    2. Koreksi Kehadiran oleh Supervisor (FLOW-08)
                  </h2>
                  <Badge variant="warning">Wajib Alasan Audit</Badge>
                </div>
                <p className="text-xs text-ink/70 mb-4">
                  Jika petugas salah memasukkan jumlah orang hadir, Supervisor dapat mengurangi
                  saldo kehadiran disertai alasan wajib:
                </p>

                <form
                  action={`/api/events/${event.id}/checkins`}
                  method="POST"
                  className="space-y-3"
                >
                  <input type="hidden" name="method" value="correction" />
                  <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-navy mb-1">
                        Pilih Grup Tamu
                      </label>
                      <select
                        name="groupIdOrQrToken"
                        className="w-full min-h-[42px] rounded-button border border-border bg-ivory px-3 py-2 text-xs font-semibold text-navy"
                      >
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.displayName} (Hadir: {g.checkedInCount}/{g.capacity})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-navy mb-1">
                        Angka Koreksi (Negatif)
                      </label>
                      <input
                        name="deltaAttendees"
                        type="number"
                        max={-1}
                        min={-10}
                        defaultValue={-1}
                        required
                        className="w-full min-h-[42px] rounded-button border border-border bg-ivory px-3 py-2 text-xs font-bold text-danger tabular-nums"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-navy mb-1">
                      Alasan Koreksi (Wajib Minimal 5 Karakter)
                    </label>
                    <input
                      name="reasonNullable"
                      type="text"
                      required
                      minLength={5}
                      placeholder="Contoh: Petugas salah tekan angka 2 padahal tamu datang sendiri"
                      className="w-full min-h-[42px] rounded-button border border-border bg-ivory px-3.5 py-2 text-xs text-ink"
                    />
                  </div>

                  <button
                    type="submit"
                    className="min-h-[42px] rounded-button border border-danger bg-danger/10 px-4 py-2 text-xs font-bold text-danger hover:bg-danger hover:text-white transition"
                  >
                    Simpan Koreksi ke Buku Besar
                  </button>
                </form>
              </div>
            )}

            {/* Riwayat Ledger Check-in */}
            <div className="rounded-card border border-gold/30 bg-surface p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-xl font-bold text-navy">
                  Buku Besar Transaksi Check-in ({ledger.length})
                </h2>
                <Link
                  href={`/app/e/${event.id}/display`}
                  className="text-xs font-bold text-gold-dark underline"
                >
                  Lihat Layar TV &rarr;
                </Link>
              </div>

              {ledger.length === 0 ? (
                <p className="text-xs text-ink/50 italic">
                  Belum ada tamu yang check-in (atau baru saja di-reset ke 0).
                </p>
              ) : (
                <ul className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {ledger.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-button border border-border bg-ivory/60 p-3 text-xs flex items-center justify-between gap-2"
                    >
                      <div>
                        <p className="font-bold text-navy">
                          {item.guestDisplayName}{' '}
                          <span className="text-gold-dark">
                            ({item.guestCategory.toUpperCase()})
                          </span>
                        </p>
                        <p className="text-[11px] text-ink/60">
                          Metode: {item.method.toUpperCase()} · Petugas: {item.actorName}
                          {item.reasonNullable ? ` · Alasan: "${item.reasonNullable}"` : ''}
                        </p>
                      </div>
                      <Badge variant={item.deltaAttendees > 0 ? 'success' : 'danger'}>
                        {item.deltaAttendees > 0
                          ? `+${item.deltaAttendees} Hadir`
                          : `${item.deltaAttendees} Koreksi`}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
