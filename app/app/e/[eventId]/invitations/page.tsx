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

export default async function EventInvitationsPage({
  params,
  searchParams,
}: {
  params: { eventId: string };
  searchParams?: { rotated?: string; error?: string };
}) {
  const user = await requireAuthenticatedUser(`/app/e/${params.eventId}/invitations`);
  const event = getEventIfAuthorized(user.userId, params.eventId);

  if (!event) {
    notFound();
  }

  const allWorkspaces = getAuthorizedWorkspacesForUser(user.userId);
  const activeWorkspace = getWorkspaceIfAuthorized(user.userId, event.workspaceId);
  const groups = listInvitationGroupsForEvent(user.userId, event.id) ?? [];

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
          <Badge variant="gold">MODUL UNDANGAN DIGITAL &amp; KEAMANAN TOKEN (S10)</Badge>
          <h1 className="mt-2 font-serif text-3xl font-bold text-navy">
            Generator Undangan Digital &amp; Token QR Unik
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink/70 max-w-3xl">
            Setiap grup tamu memiliki <strong>Token Tautan Publik</strong> (untuk membuka undangan
            &amp; mengisi RSVP) dan <strong>Token QR Check-in</strong> yang terpisah. Jika tautan
            tamu bocor, Anda dapat memutar ulang (rotate) tokennya dengan 1 klik.
          </p>
        </div>

        {searchParams?.rotated && (
          <div className="rounded-button border border-success/40 bg-success/10 p-3.5 text-xs font-bold text-success">
            ✓ Token tautan publik &amp; kode QR tamu berhasil diputar ulang (versi lama otomatis
            dinyatakan tidak berlaku)!
          </div>
        )}

        <section className="rounded-card border border-gold/30 bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-bold text-navy">
              Daftar Tautan Undangan Individual &amp; Bagikan Manual WhatsApp ({groups.length})
            </h2>
            <Link
              href={`/app/e/${event.id}/guests`}
              className="text-xs font-bold text-navy underline"
            >
              + Tambah Tamu Baru
            </Link>
          </div>

          {groups.length === 0 ? (
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
                    <th className="py-3 pr-3">Penerima Undangan</th>
                    <th className="py-3 px-3">Tautan Undangan Publik</th>
                    <th className="py-3 px-3">Token QR Hari-H</th>
                    <th className="py-3 px-3">Versi Token</th>
                    <th className="py-3 pl-3 text-right">Aksi Bagikan &amp; Keamanan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {groups.map((g) => {
                    const waMessage = `Kepada Yth. ${g.displayName},\n\nTanpa mengurangi rasa hormat, kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara pernikahan ${event.brideName} & ${event.groomName} (${event.eventDate} di ${event.venue}).\n\nSilakan buka tautan undangan khusus Anda & konfirmasi kehadiran (RSVP) melalui:\nhttps://sanstech-wedding-management-system.vercel.app/i/${g.publicTokenPreview}`;

                    const waHref = `https://wa.me/${
                      g.phoneOptional ? g.phoneOptional.replace(/^0/, '62') : ''
                    }?text=${encodeURIComponent(waMessage)}`;

                    return (
                      <tr key={g.id} className="hover:bg-ivory/50">
                        <td className="py-3.5 pr-3">
                          <p className="font-bold text-navy">{g.displayName}</p>
                          <span className="text-[11px] text-ink/60">
                            {g.guestCategory.toUpperCase()} · Kuota {g.capacity} Orang
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-xs">
                          <Link
                            href={`/i/${g.publicTokenPreview}`}
                            className="text-gold-dark underline font-semibold"
                          >
                            /i/{g.publicTokenPreview}
                          </Link>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-xs font-bold text-navy">
                          {g.qrTokenPreview}
                        </td>
                        <td className="py-3.5 px-3">
                          <Badge variant="outline">v{g.tokenVersion}</Badge>
                        </td>
                        <td className="py-3.5 pl-3 text-right space-x-2">
                          <Link
                            href={`/i/${g.publicTokenPreview}`}
                            className="inline-flex items-center rounded border border-navy/30 bg-ivory px-2.5 py-1 text-xs font-bold text-navy hover:bg-gold/15"
                          >
                            Pratinjau Undangan
                          </Link>
                          <a
                            href={waHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center rounded bg-success px-2.5 py-1 text-xs font-bold text-white hover:opacity-90"
                          >
                            Share WhatsApp
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
                              Putar Ulang Token
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
