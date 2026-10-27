import Link from 'next/link';
import {
  BRAND_SHORT_NAME,
  EffectiveRole,
  UserProfile,
  WorkspaceSummary,
} from '@/lib/types';
import { hasPermission, ROLE_LABELS_ID } from '@/lib/permissions';
import { Badge } from '@/components/ui/primitives';
import { isSupabaseConfigured } from '@/lib/db/supabase-browser';

interface AppShellProps {
  user: UserProfile;
  activeWorkspace?: WorkspaceSummary | null;
  allWorkspaces?: WorkspaceSummary[];
  effectiveRole?: EffectiveRole;
  eventId?: string;
  eventTitle?: string;
  children: React.ReactNode;
}

export function AppShell({
  user,
  activeWorkspace,
  allWorkspaces = [],
  effectiveRole = 'workspace_owner',
  eventId,
  eventTitle,
  children,
}: AppShellProps) {
  const supabaseReady = isSupabaseConfigured();

  const workspaceNav = activeWorkspace
    ? [
        {
          label: 'Ringkasan WO',
          href: `/app/w/${activeWorkspace.id}`,
          show: true,
        },
        {
          label: 'Semua Acara',
          href: `/app/w/${activeWorkspace.id}/events`,
          show: true,
        },
        {
          label: 'Ganti Workspace',
          href: '/app/workspaces',
          show: true,
        },
      ]
    : [];

  const eventNav = eventId
    ? [
        {
          label: 'Ringkasan Acara',
          href: `/app/e/${eventId}`,
          show: hasPermission(effectiveRole, 'event:view_overview'),
        },
        {
          label: 'Daftar Tamu',
          href: `/app/e/${eventId}/guests`,
          show: hasPermission(effectiveRole, 'event:manage_guests'),
          badge: 'Sprint 2',
        },
        {
          label: 'Undangan & QR',
          href: `/app/e/${eventId}/invitations`,
          show: hasPermission(effectiveRole, 'event:manage_guests'),
          badge: 'Sprint 2',
        },
        {
          label: 'Scanner Check-in',
          href: `/app/e/${eventId}/checkin`,
          show: hasPermission(effectiveRole, 'event:scan_checkin'),
          badge: 'Sprint 3',
        },
        {
          label: 'Antrean VIP & Usher',
          href: `/app/e/${eventId}/vip`,
          show: hasPermission(effectiveRole, 'event:view_vip_queue'),
          badge: 'Sprint 3',
        },
        {
          label: 'Layar Sambutan TV',
          href: `/app/e/${eventId}/display`,
          show: hasPermission(effectiveRole, 'event:configure_display'),
          badge: 'Sprint 4',
        },
        {
          label: 'Laporan & Ekspor',
          href: `/app/e/${eventId}/reports`,
          show: hasPermission(effectiveRole, 'event:view_reports'),
          badge: 'Sprint 3',
        },
        {
          label: 'Tim & Akses Acara',
          href: `/app/e/${eventId}/team`,
          show: hasPermission(effectiveRole, 'event:manage_team'),
        },
        {
          label: 'Paket & Lisensi',
          href: `/app/e/${eventId}/plan`,
          show: true,
        },
        {
          label: 'Pengaturan Acara',
          href: `/app/e/${eventId}/settings`,
          show: hasPermission(effectiveRole, 'event:edit_details'),
        },
      ].filter((item) => item.show)
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-ivory">
      {/* Banner Jujur Status Lingkungan Lokal vs Supabase */}
      {!supabaseReady && (
        <div className="bg-navy-dark text-ivory px-4 py-2 text-xs border-b border-gold/30">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong>Mode Pengembangan Lokal (Sandbox):</strong> Kredensial{' '}
              <code className="text-gold-light">.env.local</code> Supabase belum dihubungkan. Data
              berlabel <code className="text-gold-light">[CONTOH DEV]</code> hanya untuk uji alur
              multi-tenant WO &amp; Pengantin.
            </span>
            <Link
              href="/auth/login"
              className="underline text-gold-light hover:text-white font-medium"
            >
              Ganti Akun Uji Peran (WO A / Pengantin / WO B)
            </Link>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/app/workspaces"
              className="flex items-center gap-2.5 font-bold text-navy tracking-tight text-lg"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-button bg-navy text-gold-light font-serif text-base">
                S
              </span>
              <span>{BRAND_SHORT_NAME}</span>
            </Link>

            {activeWorkspace ? (
              <div className="hidden md:flex items-center gap-2 pl-3 border-l border-border text-sm">
                <span className="text-ink/60">Workspace:</span>
                <Link
                  href={`/app/w/${activeWorkspace.id}`}
                  className="font-semibold text-navy hover:underline"
                >
                  {activeWorkspace.name}
                </Link>
                <Badge variant="gold">
                  {activeWorkspace.type === 'wo' ? 'Wedding Organizer' : 'Pengantin'}
                </Badge>
              </div>
            ) : null}

            {eventTitle ? (
              <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-border text-sm">
                <span className="text-ink/60">Acara:</span>
                <span className="font-semibold text-navy truncate max-w-[200px]">
                  {eventTitle}
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="hidden sm:inline-flex">
              Peran: {ROLE_LABELS_ID[effectiveRole]}
            </Badge>

            {allWorkspaces.length > 1 && (
              <Link
                href="/app/workspaces"
                className="text-xs font-semibold text-navy hover:text-gold-dark border border-border rounded-button px-3 py-2"
              >
                Pindah Workspace ({allWorkspaces.length})
              </Link>
            )}

            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-navy">{user.displayName}</p>
              <p className="text-[11px] text-ink/60">{user.email}</p>
            </div>

            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="min-h-[38px] rounded-button border border-border bg-ivory px-3 py-1.5 text-xs font-semibold text-ink hover:bg-danger/10 hover:text-danger hover:border-danger/30 transition"
              >
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content Layout with Desktop Sidebar */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        {(workspaceNav.length > 0 || eventNav.length > 0) && (
          <aside className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-border bg-surface p-4">
            {workspaceNav.length > 0 && (
              <div className="mb-6">
                <p className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-ink/50">
                  Navigasi Workspace
                </p>
                <nav className="space-y-1">
                  {workspaceNav.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center justify-between rounded-button px-3 py-2.5 text-sm font-medium text-ink hover:bg-ivory hover:text-navy transition"
                    >
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            )}

            {eventNav.length > 0 && (
              <div>
                <p className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-ink/50">
                  Menu Acara Aktif
                </p>
                <nav className="space-y-1">
                  {eventNav.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center justify-between rounded-button px-3 py-2.5 text-sm font-medium text-ink hover:bg-ivory hover:text-navy transition"
                    >
                      <span>{item.label}</span>
                      {item.badge ? (
                        <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-semibold text-gold-dark">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  ))}
                </nav>
              </div>
            )}
          </aside>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

