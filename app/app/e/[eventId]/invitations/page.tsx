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
import { generateQrCodeDataUrl, generateQrCodeSvg } from '@/lib/qr/render';
import { InvitationStudio } from '@/components/invitation/invitation-studio';
import { DEFAULT_INVITATION_CONFIG, sanitizeInvitationConfig } from '@/lib/invitation/config';
import { buildInvitationPath } from '@/lib/invitation/signing';

export const dynamic = 'force-dynamic';

export default async function EventInvitationsPage({
  params,
  searchParams,
}: {
  params: { eventId: string };
  searchParams?: { rotated?: string; error?: string; design_saved?: string };
}) {
  const user = await requireAuthenticatedUser(`/app/e/${params.eventId}/invitations`);
  const event = getEventIfAuthorized(user.userId, params.eventId);

  if (!event) {
    notFound();
  }

  const allWorkspaces = getAuthorizedWorkspacesForUser(user.userId);
  const activeWorkspace = getWorkspaceIfAuthorized(user.userId, event.workspaceId);
  const groups = listInvitationGroupsForEvent(user.userId, event.id) ?? [];
  const invitationConfig = sanitizeInvitationConfig(
    event.invitationConfig ?? DEFAULT_INVITATION_CONFIG,
    event.planCode
  );
  const canEditDesign = ['platform_admin', 'workspace_owner', 'workspace_admin', 'event_manager', 'couple'].includes(
    event.myEffectiveRole
  );

  const groupsWithQr = await Promise.all(
    groups.map(async (g) => ({
      ...g,
      qrSvg: await generateQrCodeSvg(g.qrTokenPreview),
      qrPngUrl: await generateQrCodeDataUrl(g.qrTokenPreview),
      invitationPath: buildInvitationPath(g.publicTokenPreview, invitationConfig, event.planCode),
    }))
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
        <div>
          <Badge variant="gold">MODUL UNDANGAN DIGITAL &amp; GENERATOR QR ASLI (S10)</Badge>
          <h1 className="mt-2 font-serif text-3xl font-bold text-navy">
            Generator Undangan Digital &amp; Kartu QR Code Unik
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink/70 max-w-3xl">
            Setiap grup tamu otomatis mendapatkan <strong>Gambar Matriks QR Code 2D Asli</strong>{' '}
            yang siap dipindai kamera HP/scanner maupun diunduh (PNG) untuk dicetak pada kartu fisik.
          </p>
        </div>

        {searchParams?.rotated && (
          <div className="rounded-button border border-success/40 bg-success/10 p-3.5 text-xs font-bold text-success">
            ✓ Token tautan publik &amp; gambar kode QR tamu berhasil diputar ulang (versi lama
            otomatis dinyatakan tidak berlaku)!
          </div>
        )}

        {searchParams?.design_saved && (
          <div className="rounded-button border border-success/40 bg-success/10 p-3.5 text-xs font-bold text-success">
            ✓ Desain undangan tersimpan. Semua tautan undangan di bawah sudah memakai desain terbaru.
          </div>
        )}

        {searchParams?.error && (
          <div className="rounded-button border border-danger/40 bg-danger/10 p-3.5 text-xs font-bold text-danger">
            {searchParams.error}
          </div>
        )}

        <InvitationStudio
          eventId={event.id}
          plan={event.planCode}
          initialConfig={invitationConfig}
          brideName={event.brideName}
          groomName={event.groomName}
          eventDate={event.eventDate}
          venue={event.venue}
          canEdit={canEditDesign}
        />

        <section className="rounded-card border border-gold/30 bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-bold text-navy">
              Daftar Tautan Undangan, Gambar QR &amp; Share WhatsApp ({groupsWithQr.length})
            </h2>
            <Link
              href={`/app/e/${event.id}/guests`}
              className="text-xs font-bold text-navy underline"
            >
              + Tambah Tamu Baru
            </Link>
          </div>

          {groupsWithQr.length === 0 ? (
            <EmptyState
              title="Belum Ada Tamu untuk Dibuatkan Undangan"
              description="Tambahkan grup tamu terlebih dahulu pada menu Daftar Tamu."
              actionLabel="Ke Daftar Tamu"
              actionHref={`/app/e/${event.id}/guests`}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase text-ink/60">
                    <th className="py-3 pr-3">Gambar QR</th>
                    <th className="py-3 px-3">Penerima Undangan</th>
                    <th className="py-3 px-3">Tautan Undangan Publik</th>
                    <th className="py-3 px-3">Kode &amp; Versi</th>
                    <th className="py-3 pl-3 text-right">Aksi Bagikan &amp; Unduh QR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {groupsWithQr.map((g) => {
                    const waMessage = `Kepada Yth. ${g.displayName},\n\nTanpa mengurangi rasa hormat, kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara pernikahan ${event.brideName} & ${event.groomName} (${event.eventDate} di ${event.venue}).\n\nSilakan buka tautan undangan khusus Anda, lihat Kartu QR Check-in, & konfirmasi kehadiran (RSVP) melalui:\nhttps://sanstech-wedding-management-system.vercel.app${g.invitationPath}`;

                    const waHref = `https://wa.me/${
                      g.phoneOptional ? g.phoneOptional.replace(/^0/, '62') : ''
                    }?text=${encodeURIComponent(waMessage)}`;

                    return (
                      <tr key={g.id} className="hover:bg-ivory/50">
                        <td className="py-3 pr-3">
                          <div className="h-16 w-16 rounded border border-navy/30 bg-white p-1 shadow-sm">
                            <div
                              className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
                              dangerouslySetInnerHTML={{ __html: g.qrSvg }}
                            />
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <p className="font-bold text-navy">{g.displayName}</p>
                          <span className="text-[11px] text-ink/60">
                            {g.guestCategory.toUpperCase()} · Kuota {g.capacity} Orang
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-xs">
                          <Link
                            href={g.invitationPath}
                            className="text-gold-dark underline font-semibold"
                          >
                            /i/{g.publicTokenPreview.slice(0, 14)}…
                          </Link>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-xs">
                          <span className="font-bold text-navy block">{g.qrTokenPreview}</span>
                          <Badge variant="outline">v{g.tokenVersion}</Badge>
                        </td>
                        <td className="py-3.5 pl-3 text-right space-x-1.5">
                          <a
                            href={g.qrPngUrl}
                            download={`QR-${g.qrTokenPreview}.png`}
                            className="inline-flex items-center rounded border border-gold/50 bg-gold/15 px-2.5 py-1 text-xs font-bold text-navy hover:bg-gold/30"
                          >
                            Unduh PNG
                          </a>
                          <Link
                            href={g.invitationPath}
                            className="inline-flex items-center rounded border border-navy/30 bg-ivory px-2.5 py-1 text-xs font-bold text-navy hover:bg-gold/15"
                          >
                            Buka Undangan
                          </Link>
                          <a
                            href={waHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center rounded bg-success px-2.5 py-1 text-xs font-bold text-white hover:opacity-90"
                          >
                            Share WA
                          </a>
                          <form
                            action={`/api/events/${event.id}/guests`}
                            method="POST"
                            className="inline-block"
                          >
                            <input type="hidden" name="action" value="rotate_token" />
                            <input type="hidden" name="groupId" value={g.id} />
                            <button
                              type="submit"
                              className="rounded border border-danger/30 bg-danger/10 px-2.5 py-1 text-xs font-semibold text-danger hover:bg-danger hover:text-white transition"
                            >
                              Rotate QR
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
