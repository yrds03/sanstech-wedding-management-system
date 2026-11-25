import Link from 'next/link';
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  return <main className="min-h-screen grid place-items-center p-6"><div className="w-full max-w-md rounded-card border bg-surface p-8 space-y-5">
    <h1 className="text-2xl font-bold text-navy">Buat kata sandi baru</h1>
    {query.error && <p role="alert" className="text-danger">{query.error}</p>}
    <form action="/api/auth/reset-password" method="POST" className="space-y-4">
      <label className="block">Kata sandi baru<input className="block w-full border rounded p-3" type="password" name="password" minLength={8} maxLength={72} required autoComplete="new-password" /></label>
      <label className="block">Konfirmasi kata sandi<input className="block w-full border rounded p-3" type="password" name="confirmPassword" minLength={8} maxLength={72} required autoComplete="new-password" /></label>
      <button className="w-full rounded bg-navy text-white p-3">Simpan kata sandi</button>
    </form><Link href="/auth/login">Kembali ke halaman masuk</Link>
  </div></main>;
}
