import Link from 'next/link';
import { BRAND_NAME } from '@/lib/types';

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { next?: string; error?: string };
}) {
  const nextUrl = searchParams?.next ?? '/app/workspaces';

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-ivory px-4 py-12">
      <div className="w-full max-w-md rounded-card border border-gold/35 bg-surface p-6 sm:p-8 shadow-md">
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex h-11 w-11 items-center justify-center rounded-button bg-navy text-gold-light font-serif text-xl font-bold"
          >
            S
          </Link>
          <h1 className="mt-4 font-serif text-2xl font-bold text-navy">Masuk ke Akun Anda</h1>
          <p className="mt-1 text-xs text-ink/60">{BRAND_NAME}</p>
        </div>

        {searchParams?.error && (
          <div
            role="alert"
            className="mt-4 rounded-button border border-danger/30 bg-danger/10 p-3 text-xs text-danger font-medium"
          >
            {searchParams.error}
          </div>
        )}

        <form action="/api/auth/dev-session" method="POST" className="mt-6 space-y-4">
          <input type="hidden" name="redirectTo" value={nextUrl} />

          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-navy mb-1.5">
              Alamat Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="Masukkan alamat email resmi Anda"
              className="w-full min-h-[44px] rounded-button border border-border bg-ivory/50 px-3.5 py-2 text-sm text-ink focus:bg-surface"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-xs font-semibold text-navy">
                Kata Sandi
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs font-medium text-gold-dark hover:underline"
              >
                Lupa kata sandi?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              className="w-full min-h-[44px] rounded-button border border-border bg-ivory/50 px-3.5 py-2 text-sm text-ink focus:bg-surface"
            />
          </div>

          <button
            type="submit"
            className="w-full min-h-[44px] rounded-button bg-navy border border-gold/40 px-4 py-2.5 text-sm font-semibold text-gold-light hover:bg-navy-light transition"
          >
            Masuk ke Dashboard
          </button>
        </form>

        <div className="mt-4 rounded-button border border-gold/30 bg-gold/10 p-3 text-[11px] text-ink/75 leading-relaxed">
          <strong>Diundang sebagai Pasangan / Petugas?</strong> Ketik email yang diundang oleh WO (kata sandi
          boleh dikosongkan pada mode uji coba) — Anda langsung masuk ke acara dengan peran undangan Anda.
          Atau buka tautan undangan yang dikirim lewat WhatsApp.
        </div>

        <div className="mt-6 pt-5 border-t border-border flex items-center justify-between text-xs text-ink/70">
          <span>
            Belum punya akun?{' '}
            <Link href="/auth/register" className="font-semibold text-navy hover:underline">
              Daftar baru
            </Link>
          </span>
          <Link href="/tv" className="font-bold text-gold-dark hover:underline">
            📺 Hubungkan TV / LED
          </Link>
        </div>
      </div>
    </div>
  );
}
