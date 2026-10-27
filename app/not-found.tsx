import Link from 'next/link';
import { BRAND_NAME } from '@/lib/types';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-ivory px-4 text-center">
      <div className="max-w-md rounded-card border border-border bg-surface p-8 shadow-sm">
        <span className="inline-block rounded-full bg-danger/15 px-3 py-1 text-xs font-bold text-danger">
          404 / AKSES TERISOLASI
        </span>
        <h1 className="mt-4 text-xl font-bold text-navy">
          Halaman atau Acara Tidak Ditemukan
        </h1>
        <p className="mt-2 text-xs text-ink/70 leading-relaxed">
          Data yang Anda cari tidak tersedia atau berada di luar hak akses workspace/acara Anda
          pada {BRAND_NAME}.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/app/workspaces"
            className="min-h-[42px] inline-flex items-center rounded-button bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-light transition"
          >
            Kembali ke Workspace Saya
          </Link>
          <Link
            href="/"
            className="min-h-[42px] inline-flex items-center rounded-button border border-border px-4 py-2 text-xs font-semibold text-navy hover:bg-ivory transition"
          >
            Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
