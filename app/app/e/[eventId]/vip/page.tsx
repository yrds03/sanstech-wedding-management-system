import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import {
  getAuthorizedWorkspacesForUser,
  getEventIfAuthorized,
  getWorkspaceIfAuthorized,
  listInvitationGroupsForEvent,
} from '@/lib/db/repository';
import { AppShell } from '@/components/app/app-shell';
import { Badge, EmptyState } from '@/components/ui/primitives';

export const dynamic = 'force-dynamic';

export default async function EventVipUsherPage({
  params,
}: {
  params: { eventId: string };
}) {
  const user = await requireAuthenticatedUser(`/app/e/${params.eventId}/vip`);
  const event = getEventIfAuthorized(user.userId, params.eventId);

  if (!event) {
    notFound();
  }

  const allWorkspaces = getAuthorizedWorkspacesForUser(user.userId);
  const activeWorkspace = getWorkspaceIfAuthorized(user.userId, event.workspaceId);
  const allGroups = listInvitationGroupsForEvent(user.userId, event.id) ?? [];
  const vipGroups = allGroups.filter(
    (g) => g.guestCategory === 'vvip' || g.guestCategory === 'vip'
  );

  const arrivedVips = vipGroups.filter((g) => g.checkedInCount > 0);
  const waitingVips = vipGroups.filter((g) => g.checkedInCount === 0);

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
        <div>
          <Badge variant="gold">PANEL KOORDINASI PROTOKOL VIP &amp; TIM USHER (S15)</Badge>
          <h1 className="mt-2 font-serif text-3xl font-bold text-navy">
            Antrean Penjemputan Tamu VVIP &amp; VIP
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink/70 max-w-3xl">
            Panel internal khusus Supervisor dan Tim Usher untuk memantau tamu kehormatan yang baru
            tiba serta penempatan meja mereka — tetap aktif sekalipun tamu memilih tidak ditampilkan
            di layar TV publik.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
          {/* 1. Tamu VIP Sudah Tiba (Butuh Pendampingan Meja) */}
          <section className="rounded-card border-2 border-gold bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl font-bold text-navy">
                🔔 Baru Tiba / Sudah Check-in ({arrivedVips.length})
              </h2>
              <Badge variant="success">Prioritas Usher</Badge>
            </div>

            {arrivedVips.length === 0 ? (
              <EmptyState
                title="Belum Ada Tamu VIP yang Check-in"
                description="Saat tamu VIP/VVIP memindai QR di meja registrasi, kartu penjemputan akan langsung muncul di sini."
                actionLabel="Simulasikan Scan VIP"
                actionHref={`/app/e/${event.id}/checkin`}
              />
            ) : (
              <div className="space-y-3">
                {arrivedVips.map((g) => (
                  <div
                    key={g.id}
                    className="rounded-card border border-gold/40 bg-gold/10 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="gold">{g.guestCategory.toUpperCase()}</Badge>
                      <span className="text-xs font-bold text-success">
                        Hadir: {g.checkedInCount} / {g.capacity} Orang
                      </span>
                    </div>
                    <h3 className="font-serif text-xl font-bold text-navy">{g.displayName}</h3>
                    <p className="text-xs font-bold text-gold-dark">
                      📍 Arahkan ke: {g.tableLabelOptional ?? 'Area Kehormatan VIP'}
                    </p>
                    {g.notesPrivateOptional && (
                      <p className="text-xs text-ink/80 bg-white/80 p-2 rounded border border-border">
                        <strong>Instruksi Khusus Usher:</strong> {g.notesPrivateOptional}
                      </p>
                    )}
                    <p className="text-[11px] text-ink/60">
                      Status Layar TV Publik:{' '}
                      {g.allowedPublicDisplay
                        ? 'Ditampilkan di Layar Sambutan'
                        : 'Mode Privasi (Hanya Notifikasi Internal Usher)'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 2. Daftar Tunggu Tamu VIP yang Belum Tiba */}
          <section className="rounded-card border border-gold/30 bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl font-bold text-navy">
                Menunggu Kedatangan ({waitingVips.length})
              </h2>
              <Badge variant="outline">Siaga Pintu Utama</Badge>
            </div>

            {waitingVips.length === 0 ? (
              <p className="text-xs text-ink/60 italic">
                Seluruh tamu VIP yang terdaftar telah hadir di lokasi acara.
              </p>
            ) : (
              <div className="space-y-3">
                {waitingVips.map((g) => (
                  <div
                    key={g.id}
                    className="rounded-button border border-border bg-ivory/60 p-4 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="gold">{g.guestCategory.toUpperCase()}</Badge>
                        <span className="text-xs font-bold text-navy">{g.displayName}</span>
                      </div>
                      <p className="text-xs text-ink/65 mt-1">
                        Kuota: {g.capacity} Orang · Meja: {g.tableLabelOptional ?? 'Belum diatur'}
                      </p>
                    </div>
                    <Link
                      href={`/app/e/${event.id}/checkin?prefill=${encodeURIComponent(
                        g.qrTokenPreview
                      )}`}
                      className="rounded-button bg-navy px-3 py-1.5 text-xs font-bold text-gold-light hover:bg-navy-light"
                    >
                      Scan Hadir
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
