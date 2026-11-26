import Link from 'next/link';
import {BRAND_NAME} from '@/lib/types';
import {safeRedirectPath} from '@/lib/config';
import {isApplicationConfigured} from '@/lib/drive/config';
export default async function RegisterPage({searchParams}:{searchParams:Promise<{error?:string;next?:string}>}) {
 const query=await searchParams;
 const next=safeRedirectPath(query.next,'/onboarding');
 const configured=isApplicationConfigured();
 return <main className="min-h-screen flex items-center justify-center bg-ivory px-4 py-12"><div className="w-full max-w-md rounded-card border bg-surface p-6 sm:p-8 shadow-sm">
  <h1 className="text-xl font-bold text-navy">Buat Akun Baru</h1><p className="mt-2 text-sm text-ink/70">Mulai gunakan {BRAND_NAME} dengan akun Google Anda.</p>
  {query.error&&<p role="alert" className="mt-4 text-sm text-danger">{query.error}</p>}
  <form action="/api/auth/register" method="POST" className="mt-6 space-y-4"><input type="hidden" name="redirectTo" value={next}/>
   <p className="text-sm">Nama dan alamat email diperoleh dari akun Google yang Anda pilih. Peran dan workspace dipilih setelah masuk.</p>
   <p className="text-xs text-ink/65">Dengan melanjutkan, Anda menyetujui ketentuan penggunaan dan pelindungan data pribadi tamu.</p>
   <button type="submit" disabled={!configured} className="w-full min-h-[44px] rounded-button bg-navy px-4 py-3 text-sm font-semibold text-white hover:bg-navy-light disabled:opacity-50">Daftar dengan Google</button>
  </form>
  {!configured&&<p role="status" className="mt-4 text-sm text-ink/75">Pendaftaran Google sedang disiapkan oleh pengelola.</p>}
  <p className="mt-6 text-sm">Sudah punya akun? <Link href={`/auth/login?next=${encodeURIComponent(next)}`} className="font-semibold underline">Masuk di sini</Link></p>
 </div></main>;
}
