import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicInvitationByToken } from '@/lib/db/repository';
import { formatEventDateId } from '@/lib/dates';
import { Badge } from '@/components/ui/primitives';
import { BRAND_NAME } from '@/lib/types';
import { generateQrCodeDataUrl, generateQrCodeSvg } from '@/lib/qr/render';

export const dynamic = 'force-dynamic';

export default async function PublicInvitationPage({
  params,
  searchParams,
}: {
  params: { publicToken: string };
  searchParams?: { saved?: string; error?: string };
}) {
  const data = getPublicInvitationByToken(params.publicToken);

  if (!data) {
    notFound();
  }

  const { event, group } = data;
  const qrSvg = await generateQrCodeSvg(group.qrTokenPreview);
  const qrPngDataUrl = await generateQrCodeDataUrl(group.qrTokenPreview);

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy-dark via-navy to-navy-dark text-ivory py-12 px-4 flex flex-col items-center">
      <div className="w-full max-w-lg rounded-card border-2 border-gold/50 bg-surface text-ink overflow-hidden shadow-2xl">
        {/* Luxury Invitation Cover Header */}
        <div className="bg-navy-dark text-ivory p-8 text-center border-b-2 border-gold/40">
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold-light">
            THE ROYAL WEDDING CELEBRATION OF
          </p>
          <h1 className="mt-3 font-serif text-4xl font-bold text-white tracking-wide">
            {event.brideName} &amp; {event.groomName}
          </h1>
          <div className="my-4 h-px w-24 bg-gold/50 mx-auto" />
          <p className="text-sm text-gold-light font-medium">
            {formatEventDateId(event.eventDate)}
          </p>
          <p className="text-xs text-ivory/80 mt-1">
            Pukul {event.startTime} – {event.endTime} ({event.timezone})
          </p>
          <p className="text-xs text-ivory/90 font-semibold mt-2">
            {event.venue} · {event.city}
          </p>
        </div>

        {/* Kartu Penerima Undangan */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="rounded-card border border-gold/40 bg-ivory p-5 text-center">
            <p className="text-xs uppercase tracking-widest text-ink/60">Kepada Yth.</p>
            <h2 className="mt-1 font-serif text-2xl font-bold text-navy">{group.displayName}</h2>
            <div className="mt-2 flex items-center justify-center gap-2">
              <Badge variant="gold">Kategori: {group.guestCategory.toUpperCase()}</Badge>
              <Badge variant="outline">Berlaku untuk {group.capacity} Orang</Badge>
            </div>
            {group.tableLabelOptional && (
              <p className="mt-2 text-xs font-bold text-gold-dark">
                Penempatan Kursi: {group.tableLabelOptional}
              </p>
            )}
          </div>

          {searchParams?.saved && (
            <div className="rounded-button border border-success/40 bg-success/10 p-3.5 text-xs font-bold text-success text-center">
              ✓ Terima kasih! Konfirmasi rencana kehadiran (RSVP) Anda telah tercatat.
            </div>
          )}

          {searchParams?.error && (
            <div className="rounded-button border border-danger/40 bg-danger/10 p-3.5 text-xs font-bold text-danger text-center">
              {searchParams.error}
            </div>
          )}

          {/* Kartu QR Code Matriks 2D Asli (Siap Dipindai Kamera / Barcode Scanner) */}
          <div className="rounded-card border-2 border-gold/50 bg-white p-6 text-center shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-navy">
              Kartu Akses Check-in Hari-H (Tunjukkan di Meja Penerima Tamu)
            </p>
            <p className="text-[11px] text-ink/60 mt-0.5">
              Arahkan kamera scanner petugas ke gambar kode QR di bawah ini:
            </p>

            <div className="my-5 mx-auto w-56 rounded-card bg-white p-3 border-2 border-navy shadow-md flex flex-col items-center">
              <div
                className="w-48 h-48 [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <span className="mt-2 font-mono text-xs font-bold tracking-wider text-navy">
                {group.qrTokenPreview}
              </span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest bg-gold/20 text-gold-dark px-2.5 py-0.5 rounded">
                Kuota Akses: {group.capacity} Orang
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
              <a
                href={qrPngDataUrl}
                download={`QR-${group.qrTokenPreview}.png`}
                className="inline-flex items-center rounded-button bg-navy px-4 py-2 text-xs font-bold text-gold-light hover:bg-navy-light transition"
              >
                📥 Simpan Gambar QR ke HP (PNG)
              </a>
            </div>

            <p className="mt-3 text-[11px] text-ink/65">
              Status Kehadiran Hari-H: <strong>{group.checkedInCount}</strong> dari{' '}
              <strong>{group.capacity}</strong> tempat telah digunakan.
            </p>
          </div>

          {/* Formulir RSVP */}
          <form
            action="/api/public/rsvp"
            method="POST"
            className="space-y-4 border-t border-border pt-5"
          >
            <input type="hidden" name="token" value={group.publicTokenPreview} />

            <h3 className="font-serif text-xl font-bold text-navy text-center">
              Konfirmasi Rencana Kehadiran (RSVP)
            </h3>

            <div>
              <label className="block text-xs font-bold text-navy mb-1">
                Apakah Bapak/Ibu/Saudara/i berkenan hadir?
              </label>
              <select
                name="rsvpStatus"
                defaultValue={group.rsvpStatus === 'pending' ? 'attending' : group.rsvpStatus}
                className="w-full min-h-[44px] rounded-button border border-border bg-ivory px-3.5 py-2 text-sm text-ink"
              >
                <option value="attending">Ya, Saya Akan Hadir</option>
                <option value="declined">Maaf, Belum Bisa Hadir</option>
                <option value="unsure">Masih Ragu / Belum Pasti</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-navy mb-1">
                Rencana Jumlah Orang yang Hadir (Maksimal {group.capacity} Orang)
              </label>
              <input
                name="attendeeCount"
                type="number"
                min={0}
                max={group.capacity}
                defaultValue={group.rsvpCount || group.capacity}
                className="w-full min-h-[44px] rounded-button border border-border bg-ivory px-3.5 py-2 text-sm text-ink tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-navy mb-1">
                Ucapan &amp; Doa untuk Kedua Mempelai (Opsional)
              </label>
              <textarea
                name="noteOptional"
                rows={2}
                defaultValue={group.rsvpNote ?? ''}
                placeholder="Semoga menjadi keluarga sakinah, mawaddah, warahmah..."
                className="w-full rounded-button border border-border bg-ivory p-3 text-xs text-ink"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[46px] rounded-button bg-navy border border-gold/50 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-gold-light hover:bg-navy-light transition"
            >
              Simpan Konfirmasi RSVP
            </button>
          </form>
        </div>

        <div className="bg-ivory px-6 py-4 border-t border-border text-center text-[11px] text-ink/60 flex items-center justify-between">
          <span>Powered by {BRAND_NAME}</span>
          <Link href={`/app/e/${event.id}/invitations`} className="text-navy font-bold underline">
            Kembali ke Dashboard WO
          </Link>
        </div>
      </div>
    </div>
  );
}
