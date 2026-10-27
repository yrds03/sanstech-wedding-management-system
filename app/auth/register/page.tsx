import Link from 'next/link';
import { BRAND_NAME } from '@/lib/types';

export default function RegisterPage() {
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
          <h1 className="mt-4 text-xl font-bold text-navy">Buat Akun Baru</h1>
          <p className="mt-1 text-xs text-ink/60">
            Mulai gunakan {BRAND_NAME} sebagai Wedding Organizer atau Calon Pengantin
          </p>
        </div>

        <form action="/api/auth/dev-session" method="POST" className="mt-6 space-y-4">
          <input type="hidden" name="userId" value="user-wo-a" />
          <input type="hidden" name="redirectTo" value="/onboarding" />

          <div>
            <label htmlFor="displayName" className="block text-xs font-semibold text-navy mb-1.5">
              Nama Lengkap / Nama Tim WO
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              required
              minLength={2}
              placeholder="Contoh: Raka Pratama / SANSTECH Organizer"
              className="w-full min-h-[44px] rounded-button border border-border bg-ivory/50 px-3.5 py-2 text-sm text-ink focus:bg-surface"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-navy mb-1.5">
              Alamat Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="nama@contoh.com"
              className="w-full min-h-[44px] rounded-button border border-border bg-ivory/50 px-3.5 py-2 text-sm text-ink focus:bg-surface"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-navy mb-1.5">
              Kata Sandi (Minimal 8 Karakter)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              className="w-full min-h-[44px] rounded-button border border-border bg-ivory/50 px-3.5 py-2 text-sm text-ink focus:bg-surface"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-semibold text-navy mb-1.5"
            >
              Konfirmasi Kata Sandi
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              className="w-full min-h-[44px] rounded-button border border-border bg-ivory/50 px-3.5 py-2 text-sm text-ink focus:bg-surface"
            />
          </div>

          <label className="flex items-start gap-2.5 text-xs text-ink/75 cursor-pointer">
            <input
              type="checkbox"
              name="acceptTerms"
              required
              defaultChecked
              className="mt-0.5 h-4 w-4 rounded border-border text-navy"
            />
            <span>
              Saya menyetujui Kebijakan Privasi dan Ketentuan Pelindungan Data Pribadi tamu sesuai
              UU No. 27 Tahun 2022.
            </span>
          </label>

          <button
            type="submit"
            className="w-full min-h-[44px] rounded-button bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-light transition"
          >
            Daftar &amp; Lanjut Pilih Peran
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-ink/70">
          Sudah punya akun?{' '}
          <Link href="/auth/login" className="font-semibold text-navy hover:underline">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}

