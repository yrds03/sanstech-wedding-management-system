import Link from 'next/link';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import {
  getAllAuthorizedEventsForUser,
  getAuthorizedWorkspacesForUser,
} from '@/lib/db/repository';
import { AppShell } from '@/components/app/app-shell';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { formatEventDateId } from '@/lib/dates';
import { ROLE_LABELS_ID } from '@/lib/permissions';

export default async function WorkspacesPage() {
  const user = await requireAuthenticatedUser('/app/workspaces');
  const workspaces = getAuthorizedWorkspacesForUser(user.userId);
  const sharedEvents = getAllAuthorizedEventsForUser(user.userId);

  return (
    <AppShell user={user} allWorkspaces={workspaces}>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy">Pilih Workspace atau Acara</h1>
            <p className="mt-1 text-sm text-ink/70">
              Satu akun dapat mengelola workspace Wedding Organizer maupun menjadi kolaborator
              Calon Pengantin pada acara tertentu.
            </p>
          </div>
          <Link
            href="/onboarding"
            className="min-h-[44px] inline-flex items-center justify-center rounded-button bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-light transition"
          >
            + Buat Workspace Baru
          </Link>
        </div>

        {/* Daftar Workspace */}
        <section>
          <h2 className="text-base font-bold text-navy mb-3">
            Workspace Organisasi &amp; Pribadi ({workspaces.length})
          </h2>

          {workspaces.length === 0 ? (
            <EmptyState
              title="Belum Ada Workspace"
              description="Buat workspace pertama Anda sebagai Wedding Organizer atau Calon Pengantin."
              actionLabel="Buat Workspace Sekarang"
              actionHref="/onboarding"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workspaces.map((ws) => (
                <div
                  key={ws.id}
                  className="rounded-card border border-border bg-surface p-6 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={ws.type === 'wo' ? 'default' : 'gold'}>
                        {ws.type === 'wo' ? 'Wedding Organizer' : 'Workspace Pengantin'}
                      </Badge>
                      <Badge variant="outline">Peran: {ws.role.toUpperCase()}</Badge>
                    </div>
                    <h3 className="mt-3 text-lg font-bold text-navy">{ws.name}</h3>
                    <p className="text-xs text-ink/60 mt-0.5">Slug: /{ws.slug}</p>

                    <div className="mt-4 grid grid-cols-3 gap-2 rounded-button bg-ivory p-3 text-center">
                      <div>
                        <p className="text-lg font-bold text-navy tabular-nums">
                          {ws.activeEventsCount}
                        </p>
                        <p className="text-[11px] text-ink/60">Acara Aktif</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-navy tabular-nums">
                          {ws.upcomingEventsCount}
                        </p>
                        <p className="text-[11px] text-ink/60">Draft</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-navy tabular-nums">
                          {ws.completedEventsCount}
                        </p>
                        <p className="text-[11px] text-ink/60">Selesai</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <Link
                      href={`/app/w/${ws.id}`}
                      className="flex-1 min-h-[42px] inline-flex items-center justify-center rounded-button bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-light transition"
                    >
                      Buka Dashboard Workspace
                    </Link>
                    <Link
                      href={`/app/w/${ws.id}/events`}
                      className="min-h-[42px] inline-flex items-center justify-center rounded-button border border-border px-3.5 py-2 text-xs font-semibold text-navy hover:bg-ivory transition"
                    >
                      Semua Acara
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Daftar Acara yang Diizinkan (Termasuk Undangan Kolaborasi Couple/Staff) */}
        <section>
          <h2 className="text-base font-bold text-navy mb-3">
            Akses Langsung Acara Pernikahan ({sharedEvents.length})
          </h2>

          {sharedEvents.length === 0 ? (
            <EmptyState
              title="Belum Ada Acara yang Dapat Diakses"
              description="Anda belum memiliki acara atau belum menerima undangan kolaborasi dari Wedding Organizer."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sharedEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-card border border-border bg-surface p-5 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant="gold">{ROLE_LABELS_ID[ev.myEffectiveRole]}</Badge>
                      <Badge variant={ev.status === 'published' ? 'success' : 'outline'}>
                        Status: {ev.status.toUpperCase()} · Paket {ev.planCode.toUpperCase()}
                      </Badge>
                    </div>
                    <h3 className="mt-3 text-lg font-bold text-navy">{ev.title}</h3>
                    <p className="text-xs text-ink/70 mt-1">
                      {formatEventDateId(ev.eventDate)} · {ev.startTime}–{ev.endTime} ({ev.timezone}
                      )
                    </p>
                    <p className="text-xs text-ink/60 mt-0.5">
                      Lokasi: {ev.venue}, {ev.city} · Dikelola oleh: {ev.workspaceName}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-ink/65 tabular-nums">
                      <strong>{ev.metrics.invitationGroupsCount}</strong> Undangan (
                      <strong>{ev.metrics.invitedCapacityTotal}</strong> Kuota Orang)
                    </span>
                    <Link
                      href={`/app/e/${ev.id}`}
                      className="min-h-[38px] inline-flex items-center justify-center rounded-button bg-navy px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-light transition"
                    >
                      Buka Acara &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

