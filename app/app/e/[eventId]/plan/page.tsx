import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import {
  getAuthorizedWorkspacesForUser,
  getEventIfAuthorized,
  getWorkspaceIfAuthorized,
} from '@/lib/db/repository';
import { AppShell } from '@/components/app/app-shell';
import { PLANS_CATALOG } from '@/lib/plans';
import { Badge } from '@/components/ui/primitives';

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
  const currentPlan = PLANS_CATALOG[event.planCode];
  const allPlans = [PLANS_CATALOG.free, PLANS_CATALOG.pro, PLANS_CATALOG.pro_plus];

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
          <div className="flex items-center gap-2">
            <Badge variant="gold">Paket Saat Ini: {currentPlan.displayName}</Badge>
            <Badge variant="success">Status Lisensi: {event.licenseStatus.toUpperCase()}</Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-navy">
            Paket &amp; Kuota Acara (S20) — {event.title}
          </h1>
          <p className="mt-1 text-sm text-ink/70">
            Sesuai kebijakan MVP, aktivasi paket Pro dan Pro Plus dilakukan melalui verifikasi
            manual oleh Admin Platform (belum menggunakan payment gateway otomatis).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {allPlans.map((plan) => {
            const isCurrent = plan.code === event.planCode;
            return (
              <div
                key={plan.code}
                className={`rounded-card p-6 border flex flex-col justify-between ${
                  isCurrent
                    ? 'border-gold bg-surface shadow-md ring-1 ring-gold/40'
                    : 'border-border bg-surface shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-navy">{plan.displayName}</h2>
                    {isCurrent && <Badge variant="success">Paket Aktif</Badge>}
                  </div>
                  <p className="mt-3 text-2xl font-bold text-navy tabular-nums">
                    {plan.priceLabel}{' '}
                    <span className="text-xs font-normal text-ink/60">/ acara</span>
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
                    <li>Import Excel: {plan.features.importExcel ? 'Ya' : 'Tidak'}</li>
                    <li>Layar Sambutan: {plan.features.welcomeDisplay ? 'Ya' : 'Tidak'}</li>
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
                      Sedang Digunakan
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full min-h-[42px] rounded-button border border-navy/30 bg-ivory px-4 py-2 text-xs font-semibold text-navy opacity-80 cursor-not-allowed"
                    >
                      Ajukan Upgrade Manual (Segera hadir di Sprint 5)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

