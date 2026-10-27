import { notFound } from 'next/navigation';
import {
  getEventIfAuthorized,
  listCheckinLedgerForEvent,
  listInvitationGroupsForEvent,
} from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

export default function FullscreenDisplayScreen({
  params,
}: {
  params: { sessionId: string };
}) {
  // Gunakan user-wo-a untuk merender state layar yang dipasangkan pada acara tersebut
  const event = getEventIfAuthorized('user-wo-a', params.sessionId);
  if (!event) {
    notFound();
  }

  const groups = listInvitationGroupsForEvent('user-wo-a', event.id) ?? [];
  const ledger = listCheckinLedgerForEvent('user-wo-a', event.id) ?? [];

  const latestPublicWelcome = ledger
    .filter((l) => l.deltaAttendees > 0)
    .map((l) => groups.find((g) => g.id === l.invitationGroupId))
    .find((g) => g && g.allowedPublicDisplay);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-navy-dark via-navy to-navy-dark text-ivory p-12 text-center select-none">
      <div className="text-xs uppercase tracking-[0.4em] text-gold-light/80">
        SANSTECH ROYAL WELCOME DISPLAY · {event.venue.toUpperCase()}
      </div>

      <div className="my-auto max-w-4xl mx-auto space-y-6">
        <p className="text-sm sm:text-base uppercase tracking-[0.35em] text-gold-light">
          THE WEDDING OF
        </p>
        <h1 className="font-serif text-5xl sm:text-7xl font-bold text-white tracking-wide">
          {event.brideName} &amp; {event.groomName}
        </h1>
        <div className="my-8 h-0.5 w-48 bg-gold/60 mx-auto" />

        {latestPublicWelcome ? (
          <div className="space-y-3">
            <p className="text-lg uppercase tracking-[0.25em] text-ivory/85">Selamat Datang</p>
            <h2 className="font-serif text-4xl sm:text-6xl font-bold text-gold-light">
              {latestPublicWelcome.displayName}
            </h2>
            {latestPublicWelcome.tableLabelOptional && (
              <p className="text-xl text-white/90 mt-3">
                Silakan Menuju <strong>{latestPublicWelcome.tableLabelOptional}</strong>
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="font-serif italic text-3xl sm:text-5xl text-gold-light">
              Selamat Datang Tamu Kehormatan
            </h2>
            <p className="text-base text-ivory/75">
              Silakan menunjukkan kode QR undangan Anda pada meja registrasi
            </p>
          </div>
        )}
      </div>

      <div className="text-[11px] uppercase tracking-widest text-ivory/40">
        PRIVACY GUARD ACTIVE · NON-PUBLIC VIP NAMES HIDDEN AUTOMATICALLY
      </div>
    </div>
  );
}

