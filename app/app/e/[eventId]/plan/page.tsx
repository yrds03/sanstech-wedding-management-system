import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import {
  getAuthorizedWorkspacesForUser,
  getEventIfAuthorized,
  getWorkspaceIfAuthorized,
} from '@/lib/db/repository';
import { AppShell } from '@/components/app/app-shell';
import { evaluateEventPostLifecycle, getAddOnsCatalog, getPlansCatalog } from '@/lib/plans';
import { Badge } from '@/components/ui/primitives';

export const dynamic = 'force-dynamic';

export default async function EventPlanPage({
  params,
}: {
  params: { eventId: string };
}) {
  const user = await requireAuthenticatedUser(`/app/e/${params.eventId}/plan`);
  const event = getEventIfAuthorized(user.userId, params.eventId);

  if (!event) {
    notFound();
  }

  const allWorkspaces = getAuthorizedWorkspacesForUser(user.userId);
  const activeWorkspace = getWorkspaceIfAuthorized(user.userId, event.workspaceId);
  const catalog = getPlansCatalog();
  const addOnsCatalog = getAddOnsCatalog();
  const currentPlan = catalog[event.planCode];
  const allPlans = [catalog.free, catalog.pro, catalog.pro_plus];
  const lifecycle = evaluateEventPostLifecycle({
    eventDate: event.eventDate,
    planCode: event.planCode,
  });

  return (
    <AppShell
      user={user}
      activeWorkspace={activeWorkspace}
      allWorkspaces={allWorkspaces}
      effectiveRole={event.myEffectiveRole}
      eventId={event.id}
      eventTitle={event.title}
    >
      <div className="space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="gold">Paket Saat Ini: {currentPlan.displayName}</Badge>
              <Badge variant="success">Status Lisensi: {event.licenseStatus.toUpperCase()}</Badge>
              <Badge variant="outline">{lifecycle.badgeLabelId}</Badge>
            </div>
            <h1 className="mt-2 font-serif text-3xl font-bold text-navy">
              Paket, Add-On &amp; Masa Aktif Akun (S20) — {event.title}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-ink/70 max-w-3xl">
              {lifecycle.explanationId}
            </p>
          </div>

          {user.isPlatformAdmin && (
            <Link
              href="/admin"
              className="min-h-[42px] inline-flex items-center rounded-button bg-navy border border-gold/50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gold-light hover:bg-navy-light transition"
            >
              ⚙️ Pengaturan Harga Super Admin &rarr;
            </Link>
          )}
        </div>

        {/* 3 Paket Utama */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {allPlans.map((plan) => {
            const isCurrent = plan.code === event.planCode;
            return (
              <div
                key={plan.code}
                className={`rounded-card p-6 border flex flex-col justify-between ${
                  isCurrent
                    ? 'border-2 border-gold bg-surface shadow-lg ring-1 ring-gold/40'
                    : 'border-gold/30 bg-surface shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="font-serif text-2xl font-bold text-navy">{plan.displayName}</h2>
                    {isCurrent && <Badge variant="success">Paket Aktif</Badge>}
                  </div>
                  <p className="mt-3 font-serif text-3xl font-bold text-navy tabular-nums">
                    {plan.priceLabel}{' '}
                    <span className="font-sans text-xs font-normal text-ink/60">/ acara</span>
                  </p>
                  <ul className="mt-4 space-y-2 text-xs text-ink/80 border-t border-border pt-4">
                    <li>
                      Maksimal Undangan:{' '}
                      <strong className="tabular-nums">{plan.limits.maxInvitationGroups}</strong>{' '}
                      grup
                    </li>
                    <li>
                      Scanner Aktif:{' '}
                      <strong className="tabular-nums">{plan.limits.maxActiveScanners}</strong>{' '}
                      perangkat
                    </li>
                    <li>
                      Masa Aktif Pasca-Acara:{' '}
                      <strong>H+{plan.postEventGraceDays} Hari (Unduh Laporan)</strong>
                    </li>
                    <li>Import Excel/CSV: {plan.features.importExcel ? 'Ya' : 'Tidak'}</li>
                    <li>Layar Sambutan TV: {plan.features.welcomeDisplay ? 'Ya' : 'Tidak'}</li>
                    <li>Notifikasi Usher VIP: {plan.features.vipNotification ? 'Ya' : 'Tidak'}</li>
                  </ul>
                </div>

                <div className="mt-6">
                  {isCurrent ? (
                    <button
                      type="button"
                      disabled
                      className="w-full min-h-[42px] rounded-button bg-ivory border border-border text-xs font-semibold text-ink/50 cursor-not-allowed"
                    >
                      Sedang Digunakan pada Acara Ini
                    </button>
                  ) : user.isPlatformAdmin ? (
                    <form action="/api/admin/pricing" method="POST">
                      <input type="hidden" name="action" value="activate_event_plan" />
                      <input type="hidden" name="eventId" value={event.id} />
                      <input type="hidden" name="planCode" value={plan.code} />
                      <button
                        type="submit"
                        className="w-full min-h-[42px] rounded-button bg-navy border border-gold/50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gold-light hover:bg-navy-light transition"
                      >
                        Aktifkan Paket {plan.displayName} Sekarang
                      </button>
                    </form>
                  ) : (
                    <span className="block text-center text-xs text-ink/60 bg-ivory p-2.5 rounded-button border border-border">
                      Hubungi Admin WO untuk Upgrade Paket
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Katalog Layanan Tambahan (Add-Ons) */}
        <section className="rounded-card border border-gold/30 bg-surface p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <Badge variant="gold">LAYANAN TAMBAHAN KHUSUS (ADD-ONS)</Badge>
              <h2 className="mt-1.5 font-serif text-2xl font-bold text-navy">
                Katalog Add-On Kuota, Perangkat keras (Hardware) &amp; Kru Lapangan
              </h2>
              <p className="mt-1 text-xs text-ink/70 max-w-3xl">
                Pilih modul tambahan sesuai kebutuhan resepsi tanpa harus mengganti paket utama.
                Tersedia kuota ekstra, sewa perangkat scanner/TV, kru penerima tamu, hingga kartu
                fisik QR emboss emas.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {addOnsCatalog.map((addon) => (
              <div
                key={addon.code}
                className="rounded-button border border-gold/25 bg-ivory/50 p-4 flex flex-col justify-between hover:border-gold transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center rounded-full bg-gold/15 border border-gold/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-dark">
                      {addon.category}
                    </span>
                  </div>
                  <h3 className="mt-2.5 font-serif text-lg font-bold text-navy">{addon.name}</h3>
                  <p className="mt-1 text-xs text-ink/70 leading-relaxed">{addon.description}</p>
                  <p className="mt-1.5 text-[11px] text-gold-dark font-medium">
                    ✓ {addon.deliverableNote}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-baseline justify-between">
                  <span className="font-serif text-xl font-bold text-navy tabular-nums">
                    {addon.priceFormatted}
                  </span>
                  <span className="text-[11px] font-medium text-ink/60">{addon.unitLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
