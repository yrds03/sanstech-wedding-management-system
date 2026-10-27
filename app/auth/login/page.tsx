import Link from 'next/link';
import { BRAND_NAME } from '@/lib/types';
import { isSupabaseConfigured } from '@/lib/db/supabase-browser';
import { Badge } from '@/components/ui/primitives';

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { next?: string; error?: string };
}) {
  const supabaseReady = isSupabaseConfigured();
  const nextUrl = searchParams?.next ?? '/app/workspaces';

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-ivory px-4 py-12">
      <div className="w-full max-w-md rounded-card border border-border bg-surface p-6 sm:p-8 shadow-sm">
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex h-11 w-11 items-center justify-center rounded-button bg-navy text-gold-light font-serif text-xl font-bold"
          >
            S
          </Link>
          <h1 className="mt-4 text-xl font-bold text-navy">Selamat Datang Kembali</h1>
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

        {/* Form Login Utama */}
        <form action="/api/auth/dev-session" method="POST" className="mt-6 space-y-4">
          <input type="hidden" name="userId" value="user-wo-a" />
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
              defaultValue="owner@sanstech-wo.id"
              placeholder="nama@contoh.com"
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
              required
              defaultValue="sanstech-demo-password"
              placeholder="••••••••"
              className="w-full min-h-[44px] rounded-button border border-border bg-ivory/50 px-3.5 py-2 text-sm text-ink focus:bg-surface"
            />
          </div>

          <button
            type="submit"
            className="w-full min-h-[44px] rounded-button bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-light transition"
          >
            Masuk ke Dashboard
          </button>
        </form>

        {/* Panel Uji Cepat Multi-Peran (Hanya Development Lokal) */}
        {!supabaseReady && process.env.NODE_ENV !== 'production' && (
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-wider text-navy">
                Uji Peran &amp; Isolasi Tenant (Dev Sandbox)
              </p>
              <Badge variant="gold">Sprint 0–1</Badge>
            </div>
            <p className="text-xs text-ink/65 mb-3 leading-relaxed">
              Gunakan tombol di bawah untuk menguji isolasi akses antara Wedding Organizer A,
              Pasangan Calon Pengantin, dan Wedding Organizer B:
            </p>

            <div className="space-y-2">
              <form action="/api/auth/dev-session" method="POST">
                <input type="hidden" name="userId" value="user-wo-a" />
                <input type="hidden" name="redirectTo" value="/app/workspaces" />
                <button
                  type="submit"
                  className="w-full text-left rounded-button border border-border bg-ivory hover:bg-gold/10 px-3.5 py-2.5 text-xs transition flex items-center justify-between"
                >
                  <div>
                    <strong className="text-navy block">1. Owner Wedding Organizer A</strong>
                    <span className="text-ink/60">owner@sanstech-wo.id (Mengelola 2 Acara)</span>
                  </div>
                  <span className="font-semibold text-navy">Masuk &rarr;</span>
                </button>
              </form>

              <form action="/api/auth/dev-session" method="POST">
                <input type="hidden" name="userId" value="user-couple-andi" />
                <input type="hidden" name="redirectTo" value="/app/workspaces" />
                <button
                  type="submit"
                  className="w-full text-left rounded-button border border-border bg-ivory hover:bg-gold/10 px-3.5 py-2.5 text-xs transition flex items-center justify-between"
                >
                  <div>
                    <strong className="text-navy block">2. Calon Pengantin (Andi &amp; Putri)</strong>
                    <span className="text-ink/60">
                      andi.putri@contoh.id (Hanya akses acara miliknya)
                    </span>
                  </div>
                  <span className="font-semibold text-navy">Masuk &rarr;</span>
                </button>
              </form>

              <form action="/api/auth/dev-session" method="POST">
                <input type="hidden" name="userId" value="user-wo-b" />
                <input type="hidden" name="redirectTo" value="/app/workspaces" />
                <button
                  type="submit"
                  className="w-full text-left rounded-button border border-border bg-ivory hover:bg-gold/10 px-3.5 py-2.5 text-xs transition flex items-center justify-between"
                >
                  <div>
                    <strong className="text-navy block">3. Owner WO Tenant B (Uji Isolasi)</strong>
                    <span className="text-ink/60">
                      admin@lusiana-organizer.id (Tidak bisa buka acara WO A)
                    </span>
                  </div>
                  <span className="font-semibold text-navy">Masuk &rarr;</span>
                </button>
              </form>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-ink/70">
          Belum punya akun?{' '}
          <Link href="/auth/register" className="font-semibold text-navy hover:underline">
            Daftar sekarang
          </Link>
        </p>
      </div>
    </div>
  );
}

