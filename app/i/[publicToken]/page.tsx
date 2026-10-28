import { notFound } from 'next/navigation';
import { getPublicInvitationByToken } from '@/lib/db/repository';
import { formatEventDateId } from '@/lib/dates';
import { BRAND_NAME } from '@/lib/types';
import { generateQrCodeDataUrl, generateQrCodeSvg } from '@/lib/qr/render';
import {
  DEFAULT_INVITATION_CONFIG,
  INVITATION_THEMES,
  getInvitationFeatureAccess,
  sanitizeInvitationConfig,
} from '@/lib/invitation/config';
import { decodeInvitationConfig } from '@/lib/invitation/signing';

export const dynamic = 'force-dynamic';

export default async function PublicInvitationPage({
  params,
  searchParams,
}: {
  params: { publicToken: string };
  searchParams?: { saved?: string; error?: string; c?: string };
}) {
  const data = getPublicInvitationByToken(params.publicToken);

  if (!data) {
    notFound();
  }

  const { event, group } = data;
  const qrSvg = await generateQrCodeSvg(group.qrTokenPreview);
  const qrPngDataUrl = await generateQrCodeDataUrl(group.qrTokenPreview);

  // Desain dari tautan bertanda tangan (dibuka di HP tamu) diutamakan; fallback ke desain tersimpan acara.
  const portable = decodeInvitationConfig(searchParams?.c);
  const plan = portable?.plan ?? event.planCode;
  const config =
    portable?.config ??
    sanitizeInvitationConfig(event.invitationConfig ?? DEFAULT_INVITATION_CONFIG, event.planCode);
  const theme = INVITATION_THEMES[config.themeStyle];
  const access = getInvitationFeatureAccess(plan);
  const signedDesign = portable ? (searchParams?.c ?? '') : '';

  const waveBrand = access.whiteLabel && config.whiteLabelBrandName ? config.whiteLabelBrandName : null;

  return (
    <div className={`min-h-screen ${theme.pageClass} py-10 px-4 flex flex-col items-center`}>
      <div
        className={`w-full max-w-lg rounded-[28px] border ${theme.accentBorderClass} ${theme.cardClass} overflow-hidden shadow-2xl`}
      >
        {/* Sampul undangan */}
        <div className={`${theme.headerClass} px-8 py-10 text-center`}>
          <p className={`text-[11px] uppercase tracking-[0.35em] ${theme.accentTextClass}`}>
            Undangan Pernikahan
          </p>
          <h1 className="mt-4 font-serif text-4xl sm:text-5xl font-bold tracking-wide">
            {event.brideName}
            <span className={`block text-2xl font-normal ${theme.accentTextClass} my-1`}>&amp;</span>
            {event.groomName}
          </h1>
          <div className={`my-5 h-px w-24 mx-auto bg-current opacity-30`} />
          <p className={`text-sm font-medium ${theme.accentTextClass}`}>{formatEventDateId(event.eventDate)}</p>
          <p className="text-xs opacity-80 mt-1">
            Pukul {event.startTime} – {event.endTime} ({event.timezone})
          </p>
          <p className="text-xs font-semibold mt-2 opacity-90">
            {event.venue} · {event.city}
          </p>
        </div>

        <div className="px-6 sm:px-8 py-8 space-y-7">
          {/* Salam pembuka & kutipan */}
          <div className="text-center space-y-4">
            <p className="text-sm leading-relaxed opacity-90">{config.customGreeting}</p>
            {config.quoteText && (
              <blockquote
                className={`font-serif italic text-sm leading-relaxed ${theme.accentTextClass} border-y ${theme.accentBorderClass} py-4`}
              >
                &ldquo;{config.quoteText}&rdquo;
              </blockquote>
            )}
          </div>

          {/* Penerima */}
          <div className={`rounded-2xl border ${theme.accentBorderClass} p-5 text-center`}>
            <p className="text-[11px] uppercase tracking-[0.25em] opacity-70">Kepada Yth.</p>
            <h2 className="mt-1 font-serif text-2xl font-bold">{group.displayName}</h2>
            <p className={`mt-2 text-xs font-semibold ${theme.accentTextClass}`}>
              {group.guestCategory.toUpperCase()} · Berlaku untuk {group.capacity} orang
            </p>
            {group.tableLabelOptional && (
              <p className="mt-1 text-xs opacity-80">Penempatan: {group.tableLabelOptional}</p>
            )}
          </div>

          {/* Detail acara tambahan */}
          {(config.dressCode || config.mapsUrl) && (
            <div className="space-y-3 text-center">
              {config.dressCode && (
                <p className="text-xs">
                  <span className={`block text-[11px] uppercase tracking-[0.25em] ${theme.accentTextClass}`}>
                    Dress Code
                  </span>
                  <span className="font-semibold">{config.dressCode}</span>
                </p>
              )}
              {config.mapsUrl && (
                <a
                  href={config.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center rounded-full px-6 py-2.5 text-xs font-bold uppercase tracking-widest transition ${theme.buttonClass}`}
                >
                  Buka Lokasi di Peta
                </a>
              )}
            </div>
          )}

          {searchParams?.saved && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3.5 text-xs font-bold text-center">
              ✓ Terima kasih! Konfirmasi rencana kehadiran (RSVP) Anda telah tercatat.
            </div>
          )}

          {searchParams?.error && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/15 p-3.5 text-xs font-bold text-center">
              {searchParams.error}
            </div>
          )}

          {/* Kartu QR (selalu latar putih agar terbaca scanner) */}
          <div className="rounded-2xl bg-white text-[#15263F] p-6 text-center shadow-sm border border-black/10">
            <p className="text-xs font-bold uppercase tracking-wider">Kartu Akses Check-in Hari-H</p>
            <p className="text-[11px] opacity-70 mt-0.5">Tunjukkan QR ini kepada petugas penerima tamu.</p>

            <div className="my-5 mx-auto w-56 rounded-xl bg-white p-3 border-2 border-[#15263F] shadow-md flex flex-col items-center">
              <div
                className="w-48 h-48 [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <span className="mt-2 font-mono text-xs font-bold tracking-wider">{group.qrTokenPreview}</span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest bg-black/5 px-2.5 py-0.5 rounded">
                Kuota Akses: {group.capacity} Orang
              </span>
            </div>

            <a
              href={qrPngDataUrl}
              download={`QR-${group.qrTokenPreview}.png`}
              className="inline-flex items-center rounded-full bg-[#15263F] px-5 py-2 text-xs font-bold text-[#f1deaa] hover:opacity-90 transition"
            >
              Simpan Gambar QR ke HP (PNG)
            </a>

            <p className="mt-3 text-[11px] opacity-70">
              Status kehadiran: <strong>{group.checkedInCount}</strong> dari <strong>{group.capacity}</strong>{' '}
              tempat telah digunakan.
            </p>
          </div>

          {/* Amplop digital (Pro Plus) */}
          {access.digitalGift && config.digitalGiftBank && (
            <div className={`rounded-2xl border ${theme.accentBorderClass} p-5 text-center`}>
              <p className={`text-[11px] uppercase tracking-[0.25em] ${theme.accentTextClass}`}>
                Amplop Digital
              </p>
              <p className="mt-2 text-xs whitespace-pre-line leading-relaxed">{config.digitalGiftBank}</p>
              <p className="mt-2 text-[11px] opacity-70">
                Doa restu Anda sudah cukup bagi kami; bila berkenan berbagi kebahagiaan, tersedia melalui rekening di atas.
              </p>
            </div>
          )}

          {/* RSVP */}
          <form
            action="/api/public/rsvp"
            method="POST"
            className={`space-y-4 border-t ${theme.accentBorderClass} pt-6`}
          >
            <input type="hidden" name="token" value={group.publicTokenPreview} />
            <input type="hidden" name="c" value={signedDesign} />

            <h3 className="font-serif text-xl font-bold text-center">Konfirmasi Kehadiran (RSVP)</h3>

            <div>
              <label className="block text-xs font-bold mb-1">Apakah Bapak/Ibu/Saudara/i berkenan hadir?</label>
              <select
                name="rsvpStatus"
                defaultValue={group.rsvpStatus === 'pending' ? 'attending' : group.rsvpStatus}
                className="w-full min-h-[44px] rounded-xl border border-black/15 bg-white px-3.5 py-2 text-sm text-[#26242b]"
              >
                <option value="attending">Ya, Saya Akan Hadir</option>
                <option value="declined">Maaf, Belum Bisa Hadir</option>
                <option value="unsure">Masih Ragu / Belum Pasti</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">
                Jumlah orang yang hadir (maksimal {group.capacity})
              </label>
              <input
                name="attendeeCount"
                type="number"
                min={0}
                max={group.capacity}
                defaultValue={group.rsvpCount || group.capacity}
                className="w-full min-h-[44px] rounded-xl border border-black/15 bg-white px-3.5 py-2 text-sm text-[#26242b] tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Ucapan &amp; doa untuk kedua mempelai (opsional)</label>
              <textarea
                name="noteOptional"
                rows={2}
                defaultValue={group.rsvpNote ?? ''}
                placeholder="Semoga menjadi keluarga sakinah, mawaddah, warahmah..."
                className="w-full rounded-xl border border-black/15 bg-white p-3 text-xs text-[#26242b]"
              />
            </div>

            <button
              type="submit"
              className={`w-full min-h-[46px] rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition ${theme.buttonClass}`}
            >
              Simpan Konfirmasi RSVP
            </button>
          </form>

          <p className="text-center text-xs leading-relaxed opacity-85">{config.closingMessage}</p>
        </div>

        {/* Branding sesuai paket */}
        {(waveBrand || access.showSanstechWatermark) && (
          <div className="px-6 py-4 border-t border-black/10 text-center text-[11px] opacity-70">
            {waveBrand ? `Disajikan oleh ${waveBrand}` : `Powered by ${BRAND_NAME}`}
          </div>
        )}
      </div>
    </div>
  );
}
