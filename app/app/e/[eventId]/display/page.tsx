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
            <Badge variant="gold">LAYAR SAMBUTAN TV / LED BALLROOM OTOMATIS (S16 &amp; S17)</Badge>
            <h1 className="mt-2 font-serif text-3xl font-bold text-navy">
              Pratinjau &amp; Sinkronisasi Otomatis Layar Sambutan TV
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-ink/70 max-w-2xl">
              Layar TV menggunakan teknologi <strong>Live Auto-Polling (2,5 Detik)</strong>. Begitu
              petugas men-scan QR tamu di meja registrasi, layar TV akan berubah menampilkan nama
              tamu secara otomatis tanpa perlu me-refresh halaman.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={`/app/e/${event.id}/scanner`}
              className="min-h-[46px] inline-flex items-center justify-center rounded-button border border-gold/50 bg-ivory px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-navy hover:bg-gold/15 transition"
            >
              📷 Buka Scanner (Tab Petugas)
            </Link>
            <Link
              href={`/display/${event.id}`}
              target="_blank"
              className="min-h-[46px] inline-flex items-center justify-center rounded-button bg-navy border border-gold/50 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-gold-light shadow hover:bg-navy-light transition"
            >
              📺 Buka Layar Penuh TV (16:9) di Tab Baru &rarr;
            </Link>
          </div>
        </div>

        {/* Panduan Cara Kerja Otomatis di Lapangan */}
        <section className="rounded-card border border-gold/35 bg-surface p-6 shadow-sm">
          <h2 className="font-serif text-xl font-bold text-navy">
            Bagaimana Cara Agar Nama Tamu Muncul Otomatis di Layar TV Saat Discan?
          </h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-ink/80">
            <div className="rounded-button bg-ivory/70 border border-border p-4">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-navy text-gold-light font-bold text-xs mb-2">
                1
              </span>
              <p className="font-bold text-navy text-sm">Buka Tab TV di Laptop/Smart TV</p>
              <p className="mt-1 leading-relaxed">
                Klik tombol <strong>&ldquo;Buka Layar Penuh TV (16:9) di Tab Baru&rdquo;</strong> di
                atas pada laptop yang terhubung kabel HDMI ke TV/LED Ballroom, lalu tekan{' '}
                <code>F11</code> (Full Screen). Biarkan tab tersebut tetap terbuka.
              </p>
            </div>

            <div className="rounded-button bg-ivory/70 border border-border p-4">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-navy text-gold-light font-bold text-xs mb-2">
                2
              </span>
              <p className="font-bold text-navy text-sm">Pastikan Izin Tampil Publik Aktif</p>
              <p className="mt-1 leading-relaxed">
                Demi privasi pejabat/VVIP, hanya tamu yang memiliki centang{' '}
                <strong>Izin Tampil di Layar Publik = Ya</strong> yang akan muncul di TV. Tamu
                rahasia/incognito hanya memicu alarm Usher tanpa tampil di TV.
              </p>
            </div>

            <div className="rounded-button bg-ivory/70 border border-border p-4">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-navy text-gold-light font-bold text-xs mb-2">
                3
              </span>
              <p className="font-bold text-navy text-sm">Scan QR dari HP/Tablet Petugas</p>
              <p className="mt-1 leading-relaxed">
                Coba sekarang: buka <strong>Scanner Check-in</strong>, pilih kode{' '}
                <code>QR-ANDI-VVIP-001</code> (Bapak Ir. Budi Santoso), lalu klik Check-in. Dalam{' '}
                <strong>2,5 detik</strong>, tab TV otomatis berkedip emas &amp; menyapa beliau!
              </p>
            </div>
          </div>
        </section>

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

        {/* Status Izin Tampil TV per Tamu */}
        <section className="rounded-card border border-gold/25 bg-surface p-6 shadow-sm">
          <h3 className="font-serif text-xl font-bold text-navy">
            Status Privasi Layar TV per Grup Tamu
          </h3>
          <p className="mt-1 text-xs text-ink/65">
            Daftar di bawah ini menunjukkan tamu mana yang akan muncul di TV saat di-scan dan tamu
            mana yang disembunyikan (Incognito):
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-ivory/70 text-[11px] uppercase tracking-wider text-ink/60">
                  <th className="py-2.5 px-3">Nama Tamu</th>
                  <th className="py-2.5 px-3">Kategori</th>
                  <th className="py-2.5 px-3">Kode QR</th>
                  <th className="py-2.5 px-3">Status Hadir</th>
                  <th className="py-2.5 px-3">Tampil di TV Publik?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {groups.map((g) => (
                  <tr key={g.id}>
                    <td className="py-2.5 px-3 font-semibold text-navy">{g.displayName}</td>
                    <td className="py-2.5 px-3 uppercase">{g.guestCategory}</td>
                    <td className="py-2.5 px-3 font-mono">{g.qrTokenPreview}</td>
                    <td className="py-2.5 px-3 tabular-nums">
                      {g.checkedInCount} / {g.capacity} Orang
                    </td>
                    <td className="py-2.5 px-3">
                      {g.allowedPublicDisplay ? (
                        <Badge variant="success">✓ Ya, Tampil Otomatis di TV</Badge>
                      ) : (
                        <Badge variant="warning">🔒 Disembunyikan (Khusus Usher)</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
