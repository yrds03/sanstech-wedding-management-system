import Link from 'next/link';
import {
  BRAND_SHORT_NAME,
  EffectiveRole,
  UserProfile,
  WorkspaceSummary,
} from '@/lib/types';
import { hasPermission, ROLE_LABELS_ID } from '@/lib/permissions';
import { Badge } from '@/components/ui/primitives';

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
  allWorkspaces: _allWorkspaces = [],
  effectiveRole = 'workspace_owner',
  eventId,
  eventTitle,
  children,
}: AppShellProps) {
  const workspaceNav = activeWorkspace
    ? [
        {
          label: 'Ringkasan Eksekutif WO',
          href: `/app/w/${activeWorkspace.id}`,
          show: true,
        },
        {
          label: 'Portofolio Semua Acara',
          href: `/app/w/${activeWorkspace.id}/events`,
          show: true,
        },
        {
          label: 'Pindah Workspace',
          href: '/app/workspaces',
          show: true,
        },
      ]
    : [];

  const eventNav = eventId
    ? [
        {
          label: 'Ringkasan & Reset Data',
          href: `/app/e/${eventId}`,
          show: hasPermission(effectiveRole, 'event:view_overview'),
        },
        {
          label: 'Daftar Tamu & Import',
          href: `/app/e/${eventId}/guests`,
          show: hasPermission(effectiveRole, 'event:manage_guests'),
        },
        {
          label: 'Undangan Digital & QR',
          href: `/app/e/${eventId}/invitations`,
          show: hasPermission(effectiveRole, 'event:manage_guests'),
        },
        {
          label: 'Scanner & Check-in Hari-H',
          href: `/app/e/${eventId}/checkin`,
          show: hasPermission(effectiveRole, 'event:scan_checkin'),
        },
        {
          label: 'Protokol VIP & Usher',
          href: `/app/e/${eventId}/vip`,
          show: hasPermission(effectiveRole, 'event:view_vip_queue'),
        },
        {
          label: 'Layar Sambutan TV/LED',
          href: `/app/e/${eventId}/display`,
          show: hasPermission(effectiveRole, 'event:configure_display'),
        },
        {
          label: 'Laporan & Ekspor CSV',
          href: `/app/e/${eventId}/reports`,
          show: hasPermission(effectiveRole, 'event:view_reports'),
        },
        {
          label: 'Tim & Akses Pasangan',
          href: `/app/e/${eventId}/team`,
          show: hasPermission(effectiveRole, 'event:manage_team'),
        },
        {
          label: 'Paket, Harga & Masa Aktif',
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
      {/* Top Luxury Bar */}
      <div className="no-print bg-navy-dark text-ivory px-4 py-2 text-xs border-b border-gold/30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-gold-light animate-pulse" />
            <span className="tracking-wide text-ivory/90">
              <strong>SANSTECH ROYAL CONCIERGE</strong> — Keamanan Multi-Tenant &amp; Perlindungan
              Data Tamu Aktif
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/panduan"
              className="text-gold-light hover:text-white font-semibold underline underline-offset-4"
            >
              📖 Buku Pedoman (Siap Cetak / PDF)
            </Link>
            {user.isPlatformAdmin && (
              <Link
                href="/admin"
                className="rounded bg-gold/20 border border-gold/40 px-2.5 py-0.5 text-gold-light hover:bg-gold hover:text-navy-dark font-bold transition"
              >
                ⚙️ Panel Super Admin (Atur Harga &amp; Masa Aktif)
              </Link>
            )}
            <Link
              href="/auth/login"
              className="text-ivory/80 hover:text-white underline underline-offset-4"
            >
              Ganti Peran Uji (WO / Pengantin)
            </Link>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="no-print sticky top-0 z-30 border-b border-gold/25 bg-surface/95 backdrop-blur shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/app/workspaces"
              className="flex items-center gap-3 font-bold text-navy tracking-tight"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-button bg-gradient-to-br from-navy via-navy-light to-navy-dark text-gold-light border border-gold/40 font-serif text-xl shadow-sm">
                S
              </span>
              <div>
                <span className="font-serif text-xl tracking-wide block leading-none text-navy">
                  {BRAND_SHORT_NAME}
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-gold-dark font-semibold">
                  Luxury Guest Suite
                </span>
              </div>
            </Link>

            {activeWorkspace ? (
              <div className="hidden md:flex items-center gap-2 pl-4 border-l border-border text-sm">
                <span className="text-ink/50 text-xs">Organisasi:</span>
                <Link
                  href={`/app/w/${activeWorkspace.id}`}
                  className="font-semibold text-navy hover:text-gold-dark transition"
                >
                  {activeWorkspace.name}
                </Link>
                <Badge variant="gold">
                  {activeWorkspace.type === 'wo' ? 'Wedding Organizer' : 'Private Couple'}
                </Badge>
              </div>
            ) : null}

            {eventTitle ? (
              <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-border text-sm">
                <span className="text-ink/50 text-xs">Acara:</span>
                <span className="font-serif font-bold text-base text-navy truncate max-w-[220px]">
                  {eventTitle}
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="hidden sm:inline-flex border-gold/30">
              {ROLE_LABELS_ID[effectiveRole]}
            </Badge>

            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-navy">{user.displayName}</p>
              <p className="text-[11px] text-ink/55">{user.email}</p>
            </div>

            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="min-h-[38px] rounded-button border border-border bg-ivory px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-danger/10 hover:text-danger hover:border-danger/30 transition"
              >
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        {(workspaceNav.length > 0 || eventNav.length > 0) && (
          <aside className="no-print w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-gold/20 bg-surface p-5">
            {workspaceNav.length > 0 && (
              <div className="mb-6">
                <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gold-dark">
                  Ruang Kerja Utama
                </p>
                <nav className="space-y-1">
                  {workspaceNav.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center justify-between rounded-button px-3 py-2 text-xs font-semibold text-ink/80 hover:bg-ivory hover:text-navy border border-transparent hover:border-gold/25 transition"
                    >
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            )}

            {eventNav.length > 0 && (
              <div>
                <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gold-dark">
                  Manajemen Acara
                </p>
                <nav className="space-y-1">
                  {eventNav.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center justify-between rounded-button px-3 py-2.5 text-xs font-semibold text-ink/85 hover:bg-ivory hover:text-navy border border-transparent hover:border-gold/30 transition"
                    >
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-border space-y-2">
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-ink/45">
                Bantuan &amp; Kontrol
              </p>
              <Link
                href="/panduan"
                className="block rounded-button px-3 py-2 text-xs font-semibold text-navy bg-gold/10 border border-gold/30 hover:bg-gold/20 transition"
              >
                🖨️ Cetak Buku Pedoman WO
              </Link>
              {user.isPlatformAdmin && (
                <Link
                  href="/admin"
                  className="block rounded-button px-3 py-2 text-xs font-semibold text-ivory bg-navy hover:bg-navy-light transition"
                >
                  💎 Atur Harga &amp; Paket
                </Link>
              )}
            </div>
          </aside>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
