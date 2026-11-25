'use client';
import Link from 'next/link';
export default function ErrorPage({reset}:{error:Error & {digest?:string};reset:()=>void}) {
  return <main className="min-h-screen grid place-items-center p-6"><div role="alert" className="max-w-lg rounded-card border bg-surface p-8 space-y-4">
    <h1 className="text-2xl font-bold text-navy">Halaman belum dapat dimuat</h1><p>Periksa koneksi Anda lalu coba lagi. Jika Anda baru mengirim kehadiran, periksa riwayat sebelum membuat transaksi baru.</p>
    <button onClick={reset} className="rounded bg-navy text-white px-4 py-3">Coba lagi</button>{' '}<Link href="/app/workspaces">Kembali ke workspace</Link>
  </div></main>;
}
