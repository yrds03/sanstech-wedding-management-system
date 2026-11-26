import Link from 'next/link';
export default function AccountHelpPage(){
 return <main className="min-h-screen grid place-items-center p-6"><div className="w-full max-w-md rounded-card border bg-surface p-8 space-y-5">
  <h1 className="text-2xl font-bold text-navy">Bantuan akses akun Google</h1>
  <p>Aplikasi menggunakan akun Google. Pemulihan kata sandi dan verifikasi akun dilakukan melalui Google.</p>
  <a className="block rounded bg-navy p-3 text-center text-white" href="https://accounts.google.com/signin/recovery" rel="noreferrer">Pulihkan akun Google</a>
  <Link className="block underline" href="/auth/login">Kembali ke halaman masuk</Link>
 </div></main>;
}
