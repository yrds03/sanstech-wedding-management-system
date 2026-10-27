import Link from 'next/link';
import { BRAND_NAME } from '@/lib/types';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-ivory px-4 py-12">
      <div className="w-full max-w-md rounded-card border border-border bg-surface p-6 sm:p-8 shadow-sm">
        <h1 className="text-xl font-bold text-navy">Atur Ulang Kata Sandi</h1>
        <p className="mt-1 text-xs text-ink/65 leading-relaxed">
          Masukkan alamat email yang terdaftar pada {BRAND_NAME}. Jika akun ditemukan, tautan
          pemulihan kata sandi akan dikirimkan ke email Anda.
        </p>

        <form action="/auth/login" method="GET" className="mt-6 space-y-4">
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
              className="w-full min-h-[44px] rounded-button border border-border bg-ivory/50 px-3.5 py-2 text-sm text-ink"
            />
          </div>

          <button
            type="submit"
            className="w-full min-h-[44px] rounded-button bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-light transition"
          >
            Kirim Tautan Pemulihan
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/auth/login" className="text-xs font-semibold text-navy hover:underline">
            &larr; Kembali ke halaman Masuk
          </Link>
        </div>
      </div>
    </div>
  );
}

