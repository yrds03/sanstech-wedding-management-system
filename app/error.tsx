'use client';
import Link from 'next/link';

export default function ApplicationError({retry}:{error:unknown;retry:()=>void}) {
  return <main className="flex min-h-[70vh] items-center justify-center bg-ivory px-4 py-12"><section role="alert" className="w-full max-w-xl rounded-card border bg-surface p-6 sm:p-9">
    <h1 className="font-serif text-3xl font-bold text-navy">Halaman belum dapat dimuat</h1>
    <p className="mt-4 leading-relaxed">Koneksi atau layanan sedang bermasalah. Pastikan internet tersedia, tunggu sebentar, lalu coba lagi.</p>
    <p className="mt-3 text-sm leading-relaxed text-ink/75">Jika sebelumnya sedang menyimpan check-in, periksa riwayat setelah halaman terbuka sebelum membuat transaksi baru.</p>
    <div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={retry} className="min-h-[44px] rounded-button bg-navy px-5 py-3 font-semibold text-ivory">Coba lagi</button><Link href="/panduan#bantuan" className="min-h-[44px] rounded-button border px-5 py-3 text-navy">Buka panduan bantuan</Link></div>
  </section></main>;
}
