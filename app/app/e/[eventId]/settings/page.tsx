import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import {
  getAuthorizedWorkspacesForUser,
  getEventIfAuthorized,
  getWorkspaceIfAuthorized,
} from '@/lib/db/repository';
import { AppShell } from '@/components/app/app-shell';
import { hasPermission } from '@/lib/permissions';
import { Badge } from '@/components/ui/primitives';

export default async function EventSettingsPage({
  params,
  searchParams,
}: {
  params: { eventId: string };
  searchParams?: { saved?: string; error?: string };
}) {
  const user = await requireAuthenticatedUser(`/app/e/${params.eventId}/settings`);
  const event = getEventIfAuthorized(user.userId, params.eventId);

  if (!event) {
    notFound();
  }

  const canEdit = hasPermission(event.myEffectiveRole, 'event:edit_details');
  const allWorkspaces = getAuthorizedWorkspacesForUser(user.userId);
  const activeWorkspace = getWorkspaceIfAuthorized(user.userId, event.workspaceId);

  return (
    <AppShell
      user={user}
      activeWorkspace={activeWorkspace}
      allWorkspaces={allWorkspaces}
      effectiveRole={event.myEffectiveRole}
      eventId={event.id}
      eventTitle={event.title}
    >
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy">Pengaturan Acara (S07)</h1>
            <p className="mt-1 text-sm text-ink/70">
              Perbarui informasi mempelai, waktu resepsi, lokasi, dan status publikasi acara.
            </p>
          </div>
          <Badge variant="outline">Workspace Owner: {event.workspaceName}</Badge>
        </div>

        {searchParams?.saved && (
          <div className="rounded-button border border-success/30 bg-success/10 p-3 text-xs font-semibold text-success">
            Perubahan pengaturan acara berhasil disimpan dan dicatat ke dalam Audit Log.
          </div>
        )}

        {searchParams?.error && (
          <div className="rounded-button border border-danger/30 bg-danger/10 p-3 text-xs font-semibold text-danger">
            {searchParams.error}
          </div>
        )}

        {!canEdit ? (
          <div className="rounded-card border border-warning/30 bg-warning/10 p-6 text-sm text-warning">
            Anda tidak memiliki akses untuk mengubah detail acara ini. Hanya Pemilik Workspace,
            Manajer Acara, atau Calon Pengantin yang diizinkan.
          </div>
        ) : (
          <form
            action="/api/events"
            method="POST"
            className="rounded-card border border-border bg-surface p-6 sm:p-8 shadow-sm space-y-5"
          >
            <input type="hidden" name="mode" value="update" />
            <input type="hidden" name="eventId" value={event.id} />
            <input type="hidden" name="workspaceId" value={event.workspaceId} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="title" className="block text-xs font-semibold text-navy mb-1.5">
                  Nama / Judul Acara
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  defaultValue={event.title}
                  className="w-full min-h-[44px] rounded-button border border-border bg-ivory/50 px-3.5 py-2 text-sm text-ink"
                />
              </div>

              <div>
                <label htmlFor="brideName" className="block text-xs font-semibold text-navy mb-1.5">
                  Nama Mempelai Pertama
                </label>
                <input
                  id="brideName"
                  name="brideName"
                  type="text"
                  required
                  defaultValue={event.brideName}
                  className="w-full min-h-[44px] rounded-button border border-border bg-ivory/50 px-3.5 py-2 text-sm text-ink"
                />
              </div>

              <div>
                <label htmlFor="groomName" className="block text-xs font-semibold text-navy mb-1.5">
                  Nama Mempelai Kedua
                </label>
                <input
                  id="groomName"
                  name="groomName"
                  type="text"
                  required
                  defaultValue={event.groomName}
                  className="w-full min-h-[44px] rounded-button border border-border bg-ivory/50 px-3.5 py-2 text-sm text-ink"
                />
              </div>

              <div>
                <label htmlFor="eventDate" className="block text-xs font-semibold text-navy mb-1.5">
                  Tanggal Acara
                </label>
                <input
                  id="eventDate"
                  name="eventDate"
                  type="date"
                  required
                  defaultValue={event.eventDate}
                  className="w-full min-h-[44px] rounded-button border border-border bg-ivory/50 px-3.5 py-2 text-sm text-ink"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="startTime"
                    className="block text-xs font-semibold text-navy mb-1.5"
                  >
                    Jam Mulai
                  </label>
                  <input
                    id="startTime"
                    name="startTime"
                    type="time"
                    required
                    defaultValue={event.startTime}
                    className="w-full min-h-[44px] rounded-button border border-border bg-ivory/50 px-3 py-2 text-sm text-ink"
                  />
                </div>
                <div>
                  <label htmlFor="endTime" className="block text-xs font-semibold text-navy mb-1.5">
                    Jam Selesai
                  </label>
                  <input
                    id="endTime"
                    name="endTime"
                    type="time"
                    required
                    defaultValue={event.endTime}
                    className="w-full min-h-[44px] rounded-button border border-border bg-ivory/50 px-3 py-2 text-sm text-ink"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="timezone" className="block text-xs font-semibold text-navy mb-1.5">
                  Zona Waktu
                </label>
                <select
                  id="timezone"
                  name="timezone"
                  defaultValue={event.timezone}
                  className="w-full min-h-[44px] rounded-button border border-border bg-ivory/50 px-3.5 py-2 text-sm text-ink"
                >
                  <option value="Asia/Jakarta">WIB (Asia/Jakarta)</option>
                  <option value="Asia/Makassar">WITA (Asia/Makassar)</option>
                  <option value="Asia/Jayapura">WIT (Asia/Jayapura)</option>
                </select>
              </div>

              <div>
                <label htmlFor="status" className="block text-xs font-semibold text-navy mb-1.5">
                  Status Acara
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue={event.status}
                  className="w-full min-h-[44px] rounded-button border border-border bg-ivory/50 px-3.5 py-2 text-sm text-ink"
                >
                  <option value="draft">Draft (Persiapan)</option>
                  <option value="published">Published (Undangan Aktif)</option>
                  <option value="live">Live (Hari-H Check-in)</option>
                  <option value="completed">Completed (Selesai)</option>
                  <option value="archived">Archived (Diarsipkan)</option>
                </select>
              </div>

              <div>
                <label htmlFor="venue" className="block text-xs font-semibold text-navy mb-1.5">
                  Nama Gedung / Venue
                </label>
                <input
                  id="venue"
                  name="venue"
                  type="text"
                  required
                  defaultValue={event.venue}
                  className="w-full min-h-[44px] rounded-button border border-border bg-ivory/50 px-3.5 py-2 text-sm text-ink"
                />
              </div>

              <div>
                <label htmlFor="city" className="block text-xs font-semibold text-navy mb-1.5">
                  Kota
                </label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  required
                  defaultValue={event.city}
                  className="w-full min-h-[44px] rounded-button border border-border bg-ivory/50 px-3.5 py-2 text-sm text-ink"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="address" className="block text-xs font-semibold text-navy mb-1.5">
                  Alamat Lengkap
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  defaultValue={event.address}
                  className="w-full min-h-[44px] rounded-button border border-border bg-ivory/50 px-3.5 py-2 text-sm text-ink"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              <p className="text-xs text-ink/60">
                Kepemilikan Workspace: <strong>{event.workspaceName}</strong> (Tidak dapat diubah
                secara sepihak).
              </p>
              <button
                type="submit"
                className="min-h-[44px] rounded-button bg-navy px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-light transition"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}

