import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import {
  getAuthorizedEventsForWorkspace,
  getAuthorizedWorkspacesForUser,
  getWorkspaceIfAuthorized,
} from '@/lib/db/repository';
import { AppShell } from '@/components/app/app-shell';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { formatEventDateId } from '@/lib/dates';

export default async function WorkspaceEventsPage({
  params,
  searchParams,
}: {
  params: { workspaceId: string };
  searchParams?: { error?: string };
}) {
  const user = await requireAuthenticatedUser(`/app/w/${params.workspaceId}/events`);
  const workspace = getWorkspaceIfAuthorized(user.userId, params.workspaceId);

  if (!workspace) {
    notFound();
  }

  const allWorkspaces = getAuthorizedWorkspacesForUser(user.userId);
  const events = getAuthorizedEventsForWorkspace(user.userId, workspace.id) ?? [];

  return (
    <AppShell
      user={user}
      activeWorkspace={workspace}
      allWorkspaces={allWorkspaces}
      effectiveRole={workspace.role === 'owner' ? 'workspace_owner' : 'workspace_admin'}
    >
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">Semua Acara — {workspace.name}</h1>
          <p className="mt-1 text-sm text-ink/70">
            Kelola daftar acara pernikahan atau buat acara baru dengan kuota awal paket Free (50
            undangan).
          </p>
        </div>

        {searchParams?.error && (
          <div
            role="alert"
            className="rounded-button border border-danger/30 bg-danger/10 p-3 text-xs text-danger font-semibold"
          >
            {searchParams.error}
          </div>
        )}

        {/* Daftar Acara */}
        {events.length === 0 ? (
          <EmptyState
            title="Belum ada acara di workspace ini"
            description="Isi formulir di bawah untuk membuat acara pernikahan pertama Anda."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="rounded-card border border-border bg-surface p-5 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={ev.status === 'published' ? 'success' : 'outline'}>
                      {ev.status.toUpperCase()}
                    </Badge>
                    <Badge variant="gold">Paket {ev.planCode.toUpperCase()}</Badge>
                  </div>
                  <h2 className="mt-3 text-lg font-bold text-navy">{ev.title}</h2>
                  <p className="text-xs text-ink/75 mt-1">
                    Mempelai: <strong>{ev.brideName}</strong> &amp; <strong>{ev.groomName}</strong>
                  </p>
                  <p className="text-xs text-ink/65 mt-0.5">
                    {formatEventDateId(ev.eventDate)} · {ev.startTime}–{ev.endTime} ({ev.timezone})
                  </p>
                  <p className="text-xs text-ink/60 mt-0.5">
                    {ev.venue}, {ev.city}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-border flex items-center justify-between">
                  <div className="text-xs text-ink/70 tabular-nums">
                    <span>{ev.metrics.invitationGroupsCount} Undangan</span> ·{' '}
                    <span>{ev.metrics.invitedCapacityTotal} Kuota Orang</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/app/e/${ev.id}/settings`}
                      className="rounded-button border border-border px-3 py-1.5 text-xs font-semibold text-navy hover:bg-ivory"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/app/e/${ev.id}`}
                      className="rounded-button bg-navy px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-navy-light"
                    >
                      Buka Acara &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Formulir Buat Acara Baru (S1-03 / S07) */}
        <section
          id="buat-acara"
          className="rounded-card border border-border bg-surface p-6 sm:p-8 shadow-sm"
        >
          <h2 className="text-lg font-bold text-navy">Buat Acara Pernikahan Baru</h2>
          <p className="mt-1 text-xs text-ink/65">
            Setiap acara yang baru dibuat otomatis mendapatkan lisensi <strong>Paket Free</strong>{' '}
            (maksimal 50 grup undangan &amp; 1 perangkat scanner aktif).
          </p>

          <form action="/api/events" method="POST" className="mt-6 space-y-4">
            <input type="hidden" name="mode" value="create" />
            <input type="hidden" name="workspaceId" value={workspace.id} />

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
                  minLength={3}
                  placeholder="Contoh: Resepsi Pernikahan Rian & Nadya"
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
                  placeholder="Nadya Kusuma"
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
                  placeholder="Rian Saputra"
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
                  defaultValue="2026-12-20"
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
                    defaultValue="18:30"
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
                    defaultValue="21:30"
                    className="w-full min-h-[44px] rounded-button border border-border bg-ivory/50 px-3 py-2 text-sm text-ink"
                  />
                </div>
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
                  placeholder="Balai Kartini"
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
                  placeholder="Jakarta Selatan"
                  className="w-full min-h-[44px] rounded-button border border-border bg-ivory/50 px-3.5 py-2 text-sm text-ink"
                />
              </div>

              <div>
                <label htmlFor="timezone" className="block text-xs font-semibold text-navy mb-1.5">
                  Zona Waktu Acara
                </label>
                <select
                  id="timezone"
                  name="timezone"
                  defaultValue="Asia/Jakarta"
                  className="w-full min-h-[44px] rounded-button border border-border bg-ivory/50 px-3.5 py-2 text-sm text-ink"
                >
                  <option value="Asia/Jakarta">WIB (Asia/Jakarta)</option>
                  <option value="Asia/Makassar">WITA (Asia/Makassar)</option>
                  <option value="Asia/Jayapura">WIT (Asia/Jayapura)</option>
                </select>
              </div>

              <div>
                <label htmlFor="address" className="block text-xs font-semibold text-navy mb-1.5">
                  Alamat Lengkap (Opsional)
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  placeholder="Jl. Gatot Subroto Kav. 37"
                  className="w-full min-h-[44px] rounded-button border border-border bg-ivory/50 px-3.5 py-2 text-sm text-ink"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="min-h-[44px] rounded-button bg-navy px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-light transition"
              >
                Simpan &amp; Buat Acara
              </button>
            </div>
          </form>
        </section>
      </div>
    </AppShell>
  );
}

