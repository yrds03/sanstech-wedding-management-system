import Link from 'next/link';
export default function ServiceStatusPage() {
  return <main className="min-h-screen grid place-items-center p-6"><div className="max-w-lg rounded-card border bg-surface p-8 space-y-4">
    <h1 className="text-2xl font-bold text-navy">Layanan sedang disiapkan</h1>
    <p>Pengelola sedang menyelesaikan koneksi Google Drive dan login Google. Data acara dapat dikelola setelah konfigurasi selesai.</p>
    <Link className="inline-block rounded bg-navy px-4 py-3 text-white" href="/">Kembali ke beranda</Link>
  </div></main>;
}
