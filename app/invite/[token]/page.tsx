import Link from 'next/link';
import { peekMemberInviteByToken } from '@/lib/db/repository';
import { getRoleAccessGuide } from '@/lib/team/role-guide';
import { BRAND_NAME } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default function InviteLandingPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams?: { error?: string };
}) {
  const invite = peekMemberInviteByToken(decodeURIComponent(params.token));

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-ivory px-4 py-12">
      <div className="w-full max-w-lg rounded-card border border-gold/40 bg-surface p-6 sm:p-8 shadow-md">
        <div className="text-center">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-button bg-navy text-gold-light font-serif text-xl font-bold">
            S
          </span>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-gold-dark">{BRAND_NAME}</p>
        </div>

        {!invite ? (
          <div className="mt-6 text-center space-y-3">
            <h1 className="font-serif text-2xl font-bold text-navy">Tautan Undangan Tidak Ditemukan</h1>
            <p className="text-sm text-ink/70">
              Tautan ini tidak dikenali di browser ini. Pada mode uji coba, data tersimpan per browser —
              buka tautan di <strong>browser yang sama</strong> dengan pembuat undangan, atau minta tautan baru.
            </p>
            <Link href="/auth/login" className="inline-block text-sm font-bold text-navy underline">
              Ke halaman masuk
            </Link>
          </div>
        ) : (
          (() => {
            const guide = getRoleAccessGuide(invite.roleLabel);
            const usable = invite.status === 'pending' || invite.status === 'accepted';
            return (
              <div className="mt-5 space-y-4">
                <h1 className="font-serif text-2xl font-bold text-navy text-center">
                  Anda Diundang ke Acara &ldquo;{invite.eventTitle}&rdquo;
                </h1>
                <p className="text-center text-xs text-ink/70">
                  Dari <strong>{invite.workspaceName}</strong> untuk <strong>{invite.recipientEmail}</strong>
                </p>

                <div className="rounded-button border border-gold/40 bg-gold/10 p-4 text-xs space-y-2">
                  <p className="font-bold text-navy">Peran Anda: {guide.title}</p>
                  <div>
                    <p className="font-semibold text-success">Yang dapat Anda lakukan:</p>
                    <ul className="list-disc pl-4 text-ink/80">
                      {guide.canDo.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  {guide.cannotDo.length > 0 && (
                    <div>
                      <p className="font-semibold text-danger">Tidak termasuk:</p>
                      <ul className="list-disc pl-4 text-ink/80">
                        {guide.cannotDo.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {searchParams?.error && (
                  <div className="rounded-button border border-danger/30 bg-danger/10 p-3 text-xs font-semibold text-danger">
                    {searchParams.error}
                  </div>
                )}

                {usable ? (
                  <form action="/api/invites/accept" method="POST">
                    <input type="hidden" name="token" value={decodeURIComponent(params.token)} />
                    <button
                      type="submit"
                      className="w-full min-h-[48px] rounded-button bg-navy border border-gold/50 px-5 py-3 text-xs font-bold uppercase tracking-widest text-gold-light hover:bg-navy-light transition"
                    >
                      Terima Undangan &amp; Masuk ke Acara
                    </button>
                  </form>
                ) : (
                  <div className="rounded-button border border-danger/30 bg-danger/10 p-3 text-xs font-semibold text-danger">
                    Undangan ini {invite.status === 'revoked' ? 'telah dicabut' : 'telah kedaluwarsa'}. Hubungi
                    penyelenggara untuk meminta tautan baru.
                  </div>
                )}

                <p className="text-center text-[11px] text-ink/55">
                  Lain kali Anda juga bisa masuk dari halaman &ldquo;Masuk&rdquo; dengan email{' '}
                  <strong>{invite.recipientEmail}</strong>.
                </p>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}

