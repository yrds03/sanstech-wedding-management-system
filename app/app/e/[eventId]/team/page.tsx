import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import {
  getAuthorizedWorkspacesForUser,
  getEventIfAuthorized,
  getWorkspaceIfAuthorized,
  listMemberInvitesForEvent,
} from '@/lib/db/repository';
import { AppShell } from '@/components/app/app-shell';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { hasPermission, ROLE_LABELS_ID } from '@/lib/permissions';
import { getRoleAccessGuide } from '@/lib/team/role-guide';

const APP_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')
    ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
    : 'https://sanstech-wedding-management-system.vercel.app';

function buildInviteWhatsAppMessage(params: {
  eventTitle: string;
  workspaceName: string;
  roleTitle: string;
  email: string;
  link: string;
}): string {
  return [
    `Halo, Anda diundang oleh ${params.workspaceName} untuk acara "${params.eventTitle}" sebagai ${params.roleTitle}.`,
    '',
    'Cara masuk (pilih salah satu):',
    `1) Klik tautan ini lalu tekan "Terima Undangan": ${params.link}`,
    `2) Atau buka ${APP_ORIGIN}/auth/login dan masuk dengan email: ${params.email}`,
    '',
    'Tautan berlaku 72 jam. Jangan bagikan tautan ini kepada orang lain.',
  ].join('\n');
}

export default async function EventTeamPage({
  params,
  searchParams,
}: {
  params: { eventId: string };
  searchParams?: { invited?: string; revoked?: string; error?: string };
}) {
  const user = await requireAuthenticatedUser(`/app/e/${params.eventId}/team`);
  const event = getEventIfAuthorized(user.userId, params.eventId);

  if (!event) {
    notFound();
  }

  const allWorkspaces = getAuthorizedWorkspacesForUser(user.userId);
  const activeWorkspace = getWorkspaceIfAuthorized(user.userId, event.workspaceId);
  const invites = listMemberInvitesForEvent(user.userId, event.id) ?? [];
  const canManageTeam = hasPermission(event.myEffectiveRole, 'event:manage_team');

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
          <h1 className="text-2xl font-bold text-navy">
            Tim Acara &amp; Kolaborasi Pasangan (S19)
          </h1>
          <p className="mt-1 text-sm text-ink/70">
            Undang Calon Pengantin, Supervisor Hari-H, Petugas Scanner (Receptionist), atau Tim
            Usher VIP dengan akses terbatas khusus untuk acara <strong>{event.title}</strong>.
          </p>
        </div>

        {/* Penjelasan alur akses anggota tim */}
        <section className="rounded-card border border-gold/40 bg-gold/10 p-5 space-y-3">
          <h2 className="text-base font-bold text-navy">Bagaimana Anggota Tim / Pasangan Masuk?</h2>
          <ol className="list-decimal pl-5 text-xs text-ink/80 space-y-1.5">
            <li>
              Anda mengundang <strong>satu per satu</strong>: isi email, pilih peran, klik{' '}
              <em>Buat Tautan Undangan Tim</em>.
            </li>
            <li>
              Klik <strong>Kirim Akses via WhatsApp</strong> pada baris undangan — pesan berisi tautan masuk
              1-klik dan petunjuk login sudah tersusun otomatis.
            </li>
            <li>
              Penerima punya <strong>2 cara masuk</strong>: (a) klik tautan undangan lalu{' '}
              <em>Terima Undangan</em>, atau (b) buka halaman Masuk dan ketik email yang diundang.
            </li>
            <li>
              Setelah masuk, penerima <strong>hanya melihat acara ini</strong> dan menu sesuai perannya
              (mis. petugas scanner hanya melihat Scanner). Anda bisa mencabut akses kapan saja.
            </li>
            <li>
              Ingin memastikan tampilannya benar? Klik <strong>Masuk &amp; Simulasikan Peran Ini</strong>, lalu
              kembali dengan tombol <em>Kembali ke Akun Saya</em>.
            </li>
          </ol>
          <p className="text-[11px] text-ink/65">
            <strong>Catatan mode uji coba:</strong> saat ini data tersimpan per browser (belum terhubung database
            Supabase). Simulasi peran dan login email undangan bekerja di browser yang sama dengan pembuat
            undangan. Untuk anggota tim di HP/laptop lain secara nyata, sambungkan Supabase terlebih dahulu.
          </p>
        </section>

        {searchParams?.invited && (
          <div className="rounded-button border border-success/30 bg-success/10 p-3 text-xs font-semibold text-success">
            Tautan undangan ber-token aman untuk <strong>{searchParams.invited}</strong> berhasil
            dibuat (masa berlaku 72 jam).
          </div>
        )}

        {searchParams?.revoked && (
          <div className="rounded-button border border-warning/30 bg-warning/10 p-3 text-xs font-semibold text-warning">
            Akses undangan anggota telah dicabut dan dicatat ke Audit Log.
          </div>
        )}

        {searchParams?.error && (
          <div className="rounded-button border border-danger/30 bg-danger/10 p-3 text-xs font-semibold text-danger">
            {searchParams.error}
          </div>
        )}

        {/* Formulir Undang Anggota Tim / Pasangan */}
        {canManageTeam ? (
          <section className="rounded-card border border-border bg-surface p-6 shadow-sm">
            <h2 className="text-base font-bold text-navy">Undang Anggota Baru ke Acara Ini</h2>
            <p className="mt-1 text-xs text-ink/65">
              Anda tidak dapat mengundang peran yang lebih tinggi dari peran Anda saat ini (
              <strong>{ROLE_LABELS_ID[event.myEffectiveRole]}</strong>). Pasangan pengantin yang
              diundang hanya dapat melihat acara ini, bukan acara klien WO lainnya.
            </p>

            <form
              action={`/api/events/${event.id}/member-invites`}
              method="POST"
              className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end"
            >
              <input type="hidden" name="action" value="create" />

              <div>
                <label
                  htmlFor="recipientEmail"
                  className="block text-xs font-semibold text-navy mb-1.5"
                >
                  Email Penerima Undangan
                </label>
                <input
                  id="recipientEmail"
                  name="recipientEmail"
                  type="email"
                  required
                  placeholder="pasangan.atau.staf@contoh.id"
                  className="w-full min-h-[44px] rounded-button border border-border bg-ivory/50 px-3.5 py-2 text-sm text-ink"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-xs font-semibold text-navy mb-1.5">
                  Peran pada Acara (Event Role)
                </label>
                <select
                  id="role"
                  name="role"
                  defaultValue="couple"
                  className="w-full min-h-[44px] rounded-button border border-border bg-ivory/50 px-3.5 py-2 text-sm text-ink"
                >
                  <option value="couple">Calon Pengantin (Couple Collaborator)</option>
                  <option value="event_manager">Manajer Acara (Event Manager)</option>
                  <option value="supervisor">Supervisor Hari-H (Koreksi &amp; Pantau)</option>
                  <option value="receptionist">Petugas Penerima Tamu (Scanner QR)</option>
                  <option value="usher">Tim Usher VIP (Penjemputan Tamu Penting)</option>
                  <option value="viewer">Pengamat Laporan (Viewer)</option>
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full min-h-[44px] rounded-button bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-light transition"
                >
                  Buat Tautan Undangan Tim
                </button>
              </div>
            </form>
          </section>
        ) : (
          <div className="rounded-card border border-border bg-surface p-5 text-xs text-ink/70">
            Peran Anda (<strong>{ROLE_LABELS_ID[event.myEffectiveRole]}</strong>) hanya memiliki
            akses baca pada daftar tim.
          </div>
        )}

        {/* Daftar Undangan Anggota & Status Token */}
        <section className="rounded-card border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-base font-bold text-navy mb-4">
            Daftar Undangan &amp; Akses Kolaborator ({invites.length})
          </h2>

          {invites.length === 0 ? (
            <EmptyState
              title="Belum Ada Undangan Tim"
              description="Gunakan formulir di atas untuk mengundang pasangan pengantin atau petugas penerima tamu."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-ink/60">
                    <th className="py-3 pr-4">Email Anggota</th>
                    <th className="py-3 px-4">Peran Acara</th>
                    <th className="py-3 px-4">Status Token</th>
                    <th className="py-3 px-4">Kedaluwarsa</th>
                    <th className="py-3 pl-4 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invites.map((inv) => (
                    <tr key={inv.id} className="hover:bg-ivory/50">
                      <td className="py-3.5 pr-4">
                        <p className="font-semibold text-navy">{inv.recipientEmail}</p>
                        {inv.inviteUrlPreview && inv.status === 'pending' && (
                          <p className="text-[11px] text-gold-dark mt-0.5 break-all">
                            Tautan masuk: <code>{inv.inviteUrlPreview}</code>
                          </p>
                        )}
                        <p className="text-[11px] text-ink/55 mt-0.5">
                          Login: email di atas di halaman Masuk (kata sandi bebas pada mode uji coba).
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="gold">{inv.roleLabel.toUpperCase()}</Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            inv.status === 'accepted'
                              ? 'success'
                              : inv.status === 'revoked' || inv.status === 'expired'
                              ? 'danger'
                              : 'outline'
                          }
                        >
                          {inv.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-ink/65">
                        {new Date(inv.expiresAt).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-3.5 pl-4 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          {inv.status !== 'revoked' && inv.status !== 'expired' && (
                            <>
                              <a
                                href={`https://wa.me/?text=${encodeURIComponent(buildInviteWhatsAppMessage({
                                  eventTitle: event.title,
                                  workspaceName: event.workspaceName,
                                  roleTitle: getRoleAccessGuide(inv.roleLabel).title,
                                  email: inv.recipientEmail,
                                  link: inv.inviteUrlPreview ? `${APP_ORIGIN}${inv.inviteUrlPreview}` : `${APP_ORIGIN}/auth/login`,
                                }))}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-button bg-success px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
                              >
                                Kirim Akses via WhatsApp
                              </a>
                              {canManageTeam && (
                                <form action="/api/auth/simulate-member" method="POST">
                                  <input type="hidden" name="eventId" value={event.id} />
                                  <input type="hidden" name="inviteId" value={inv.id} />
                                  <button
                                    type="submit"
                                    className="rounded-button border border-gold/60 bg-gold/15 px-3 py-1.5 text-xs font-bold text-navy hover:bg-gold/30 transition"
                                  >
                                    Masuk &amp; Simulasikan Peran Ini
                                  </button>
                                </form>
                              )}
                            </>
                          )}
                          {canManageTeam && inv.status !== 'revoked' ? (
                            <form
                              action={`/api/events/${event.id}/member-invites`}
                              method="POST"
                              className="inline-block"
                            >
                              <input type="hidden" name="action" value="revoke" />
                              <input type="hidden" name="inviteId" value={inv.id} />
                              <button
                                type="submit"
                                className="rounded-button border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger hover:text-white transition"
                              >
                                Cabut Akses
                              </button>
                            </form>
                          ) : (
                            <span className="text-xs text-ink/40">—</span>
                          )}
                        </div>
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

