import Link from 'next/link';
import {BRAND_NAME} from '@/lib/types';
import {isLocalDemoEnabled, safeRedirectPath} from '@/lib/config';
import {isApplicationConfigured} from '@/lib/drive/config';

export default async function LoginPage({searchParams}: {searchParams?: Promise<{next?:string;error?:string;notice?:string}>}) {
 const query=await searchParams;
 const next=safeRedirectPath(query?.next);
 const configured=isApplicationConfigured();
 return <main className="min-h-screen flex items-center justify-center bg-ivory px-4 py-12">
  <div className="w-full max-w-md rounded-card border border-gold/35 bg-surface p-6 sm:p-8 shadow-md">
   <div className="text-center"><Link href="/" className="inline-flex h-11 w-11 items-center justify-center rounded-button bg-navy text-gold-light font-serif text-xl font-bold">S</Link>
    <h1 className="mt-4 font-serif text-2xl font-bold text-navy">Masuk ke Akun Anda</h1><p className="mt-1 text-xs text-ink/60">{BRAND_NAME}</p></div>
   {query?.error&&<p role="alert" className="mt-4 rounded border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{query.error}</p>}
   {query?.notice&&<p role="status" className="mt-4 text-sm text-success">{query.notice}</p>}
   <form action="/api/auth/login" method="POST" className="mt-6 space-y-4">
    <input type="hidden" name="redirectTo" value={next}/>
    <p className="text-sm text-ink/75">Gunakan akun Google Anda untuk masuk dan mengelola acara.</p>
    <button type="submit" disabled={!configured} className="w-full min-h-[44px] rounded-button border border-gold/40 bg-navy px-4 py-3 text-sm font-semibold text-gold-light hover:bg-navy-light disabled:opacity-50">Lanjutkan dengan Google</button>
    <p className="text-xs text-ink/65">Dengan melanjutkan, Anda menyetujui ketentuan penggunaan dan pelindungan data pribadi tamu.</p>
   </form>
   {!configured&&<p role="status" className="mt-4 rounded border border-gold/30 bg-gold/10 p-3 text-sm">Login Google sedang disiapkan oleh pengelola.</p>}
   <div className="mt-4 rounded-button border border-gold/30 bg-gold/10 p-3 text-xs text-ink/75"><strong>Diundang sebagai pasangan atau petugas?</strong> Gunakan akun Google dengan email penerima undangan, lalu buka tautan undangan penyelenggara.</div>
   {isLocalDemoEnabled()&&<div className="mt-4 rounded border p-3 text-sm"><p>Simulasi lokal ? data pengujian</p>{['user-wo-a','user-couple-andi','user-wo-b','user-platform-admin'].map(userId=><form key={userId} action="/api/auth/dev-session" method="POST"><input type="hidden" name="userId" value={userId}/><input type="hidden" name="redirectTo" value={next}/><button className="py-2 underline">{userId}</button></form>)}</div>}
   <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-border pt-5 text-xs"><Link className="font-semibold text-navy hover:underline" href={`/auth/register?next=${encodeURIComponent(next)}`}>Daftar baru</Link><Link className="font-semibold text-gold-dark hover:underline" href="/tv">Hubungkan TV / LED</Link></div>
   <Link className="mt-4 inline-block text-xs underline" href="/auth/forgot-password">Bantuan akses akun Google</Link>
  </div>
 </main>;
}
