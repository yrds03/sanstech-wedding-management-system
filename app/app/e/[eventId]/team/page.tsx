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
                            Tautan Uji: <code>{inv.inviteUrlPreview}</code>
                          </p>
                        )}
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

