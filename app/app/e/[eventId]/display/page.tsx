import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import {
  getAuthorizedWorkspacesForUser,
  getEventIfAuthorized,
  getEventTvPairingCode,
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
  const tvPairingCode = getEventTvPairingCode(event.id);

  const latestPublicWelcome = ledger
    .filter((l) => l.deltaAttendees > 0)
    .map((l) => groups.find((g) => g.id === l.invitationGroupId))
    .find((g) => g && g.allowedPublicDisplay);

  const waOperatorText = `Halo Tim Multimedia / Operator LED Panggung untuk acara *${event.title}* (${event.brideName} & ${event.groomName}).\n\nSilakan buka portal layar sambutan di Laptop HDMI / Smart TV:\n1. Buka menu */tv* pada website sistem kami\n2. Masukkan Kode Pairing TV 6-Digit: *${tvPairingCode}*\n(Atau buka langsung tautan layar penuh: /display/${tvPairingCode})\n3. Tekan F11 untuk Full Screen. Nama tamu akan muncul otomatis saat di-scan di meja registrasi.`;

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
            <Badge variant="gold">KONEKSI SMART TV &amp; VIDEOTRON LED PANGGUNG (S16 &amp; S17)</Badge>
            <h1 className="mt-2 font-serif text-3xl font-bold text-navy">
              Pairing Layar TV / LED Panggung Lintas Perangkat
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-ink/70 max-w-2xl">
              Hubungkan <strong>Laptop Operator Multimedia/LED Panggung</strong> atau{' '}
              <strong>Smart TV di Foyer</strong> menggunakan <strong>Kode Pairing 6-Digit</strong>{' '}
              di bawah ini. Saat petugas di pintu depan men-scan QR tamu dari HP, layar TV di
              panggung otomatis menampilkan sambutan!
            </p>
          </div>
        </div>

        {/* Panel Kode Pairing 6-Digit untuk Laptop Operator LED / Smart TV Terpisah */}
        <section className="rounded-card border-2 border-gold bg-gradient-to-r from-navy-dark via-navy to-navy-light text-ivory p-6 sm:p-8 shadow-lg">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div className="lg:col-span-2 space-y-3">
              <Badge variant="gold">CARA MENGHUBUNGKAN KE TV / LED PANGGUNG ASLI</Badge>
              <h2 className="font-serif text-2xl font-bold text-white">
                Bukan Sekadar Buka Tab di HP Petugas — Ini Cara Sambung ke Laptop Operator LED / TV:
              </h2>
              <ol className="list-decimal pl-5 space-y-2 text-xs sm:text-sm text-ivory/85">
                <li>
                  Pada <strong>Laptop Operator LED Panggung</strong> (yang dicolok kabel HDMI ke
                  Videotron/Proyektor/TV) atau pada <strong>Browser Smart TV</strong>, buka alamat
                  website ini lalu tambahkan <strong><code>/tv</code></strong> di belakangnya.
                </li>
                <li>
                  Masukkan <strong>Kode Pairing 6-Digit Acara Ini</strong> (di sebelah kanan:{' '}
                  <strong className="text-gold-light font-mono text-base">{tvPairingCode}</strong>)
                  tanpa perlu login akun admin WO.
                </li>
                <li>
                  Tekan <strong>F11 (Full Screen)</strong> di laptop operator LED. Sekarang setiap
                  kali petugas penerima tamu di pintu depan men-scan QR menggunakan HP mereka, layar
                  LED panggung akan <strong>otomatis berubah sendiri dalam 2,5 detik</strong>{' '}
                  melalui jaringan Cloud!
                </li>
              </ol>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(waOperatorText)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="min-h-[42px] inline-flex items-center rounded-button bg-gold px-4 py-2 text-xs font-bold uppercase tracking-wider text-navy-dark hover:bg-gold-light transition shadow"
                >
                  📲 Kirim Kode Pairing ke WA Operator LED Panggung
                </a>
                <Link
                  href="/tv"
                  target="_blank"
                  className="min-h-[42px] inline-flex items-center rounded-button border border-gold/50 bg-ivory/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gold-light hover:bg-ivory/20 transition"
                >
                  🔗 Buka Portal Pairing /tv
                </Link>
                <Link
                  href={`/display/${tvPairingCode}`}
                  target="_blank"
                  className="min-h-[42px] inline-flex items-center rounded-button border border-border/40 bg-navy-dark px-4 py-2 text-xs font-semibold text-ivory hover:border-gold transition"
                >
                  📺 Pratinjau Layar 16:9 Sekarang &rarr;
                </Link>
              </div>
            </div>

            <div className="rounded-card border-2 border-gold bg-navy-dark p-6 text-center shadow-inner">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-light">
                KODE PAIRING TV / LED ACARA
              </p>
              <p className="mt-3 font-mono text-4xl sm:text-5xl font-bold tracking-[0.25em] text-white">
                {tvPairingCode}
              </p>
              <p className="mt-2 text-[11px] text-ivory/65">
                Ketik kode 6 angka ini di menu <code>/tv</code> pada Smart TV atau Laptop HDMI
                Operator Panggung
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
            Daftar Tamu &amp; Status Izin Tampil di Layar TV ({groups.length} Grup)
          </h3>
          <p className="mt-1 text-xs text-ink/65">
            Pastikan tamu yang ingin disapa di layar TV memiliki status{' '}
            <strong>Ya, Tampil Otomatis di TV</strong> saat Anda menginput atau mengimpor Excel:
          </p>
          {groups.length === 0 ? (
            <p className="mt-4 text-xs text-ink/50 italic">
              Belum ada tamu pada acara ini. Silakan tambahkan atau import Excel di menu Daftar Tamu.
            </p>
          ) : (
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
          )}
        </section>
      </div>
    </AppShell>
  );
}
