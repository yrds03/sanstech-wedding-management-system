import Link from 'next/link';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import {
  acceptMemberInviteByToken,
  getAuthorizedWorkspacesForUser,
} from '@/lib/db/repository';
import { BRAND_NAME } from '@/lib/types';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: { invite_token?: string; error?: string };
}) {
  const user = await requireAuthenticatedUser('/onboarding');
  const existingWorkspaces = getAuthorizedWorkspacesForUser(user.userId);
  const idempotencyKey = crypto.randomUUID();

  let inviteResult: { ok: boolean; eventId?: string | null; error?: string } | null = null;
  if (searchParams?.invite_token) {
    inviteResult = acceptMemberInviteByToken({
      userId: user.userId,
      rawToken: searchParams.invite_token,
    });
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-ivory px-4 py-12">
      <div className="w-full max-w-xl rounded-card border border-border bg-surface p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gold-dark">
              Langkah Awal (Onboarding)
            </p>
            <h1 className="mt-1 text-2xl font-bold text-navy">
              Pilih Cara Menggunakan {BRAND_NAME}
            </h1>
          </div>
          {existingWorkspaces.length > 0 && (
            <Link
              href="/app/workspaces"
              className="text-xs font-semibold text-navy underline hover:text-gold-dark"
            >
              Ke Workspace Saya ({existingWorkspaces.length})
            </Link>
          )}
        </div>

        {inviteResult && (
          <div
            className={`mt-4 rounded-button p-4 text-xs border ${
              inviteResult.ok
                ? 'border-success/30 bg-success/10 text-success'
                : 'border-danger/30 bg-danger/10 text-danger'
            }`}
          >
            {inviteResult.ok ? (
              <div className="flex items-center justify-between">
                <span>Undangan tim berhasil diverifikasi dan diaktifkan!</span>
                {inviteResult.eventId && (
                  <Link
                    href={`/app/e/${inviteResult.eventId}`}
                    className="font-bold underline ml-2"
                  >
                    Buka Acara Sekarang &rarr;
                  </Link>
                )}
              </div>
            ) : (
              <span>{inviteResult.error}</span>
            )}
          </div>
        )}

        {searchParams?.error && (
          <div
            role="alert"
            className="mt-4 rounded-button border border-danger/30 bg-danger/10 p-3 text-xs text-danger font-medium"
          >
            {searchParams.error}
          </div>
        )}

        <form action="/api/workspaces" method="POST" className="mt-6 space-y-5">
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

          <fieldset>
            <legend className="text-xs font-semibold text-navy mb-2.5">
              Siapa Pengguna Utama Workspace Ini?
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="relative flex flex-col rounded-card border border-border bg-ivory/60 p-4 cursor-pointer hover:border-navy transition">
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="type"
                    value="wo"
                    defaultChecked
                    className="h-4 w-4 text-navy"
                  />
                  <span className="font-bold text-sm text-navy">Wedding Organizer (WO)</span>
                </div>
                <p className="mt-2 text-xs text-ink/70 leading-relaxed">
                  Kelola banyak klien, banyak acara pernikahan, tim scanner, dan usher dari satu
                  dashboard bisnis.
                </p>
              </label>

              <label className="relative flex flex-col rounded-card border border-border bg-ivory/60 p-4 cursor-pointer hover:border-navy transition">
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="type"
                    value="personal"
                    className="h-4 w-4 text-navy"
                  />
                  <span className="font-bold text-sm text-navy">Calon Pengantin</span>
                </div>
                <p className="mt-2 text-xs text-ink/70 leading-relaxed">
                  Kelola acara pernikahan pribadi, daftar tamu keluarga, tautan undangan, dan
                  pantau kehadiran.
                </p>
              </label>
            </div>
          </fieldset>

          <div>
            <label htmlFor="name" className="block text-xs font-semibold text-navy mb-1.5">
              Nama Bisnis WO atau Nama Pasangan
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              minLength={2}
              placeholder="Contoh: SANSTECH Wedding Organizer / Pernikahan Budi & Sari"
              className="w-full min-h-[44px] rounded-button border border-border bg-ivory/50 px-3.5 py-2 text-sm text-ink focus:bg-surface"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="slug" className="block text-xs font-semibold text-navy mb-1.5">
                Slug Workspace (Opsional, Otomatis)
              </label>
              <input
                id="slug"
                name="slug"
                type="text"
                pattern="^[a-z0-9-]+$"
                placeholder="sanstech-wo"
                className="w-full min-h-[44px] rounded-button border border-border bg-ivory/50 px-3.5 py-2 text-sm text-ink focus:bg-surface"
              />
              <p className="mt-1 text-[11px] text-ink/55">
                Huruf kecil, angka, dan tanda hubung (-).
              </p>
            </div>

            <div>
              <label
                htmlFor="cityOptional"
                className="block text-xs font-semibold text-navy mb-1.5"
              >
                Kota Domisili (Opsional)
              </label>
              <input
                id="cityOptional"
                name="cityOptional"
                type="text"
                placeholder="Jakarta / Bandung / Surabaya"
                className="w-full min-h-[44px] rounded-button border border-border bg-ivory/50 px-3.5 py-2 text-sm text-ink focus:bg-surface"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full min-h-[46px] rounded-button bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-light transition"
          >
            Buat Workspace &amp; Lanjutkan
          </button>
        </form>
      </div>
    </div>
  );
}

