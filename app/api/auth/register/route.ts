import { routeError, readFormBody } from '@/lib/http';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { isSupabaseConfigured } from '@/lib/db/supabase-browser';
import { registerSchema } from '@/lib/validators';
import { verifySameOriginMutation } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  try {

  if (!verifySameOriginMutation(request)) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Asal permintaan tidak sah.' } }, { status: 403 });
  if (!isSupabaseConfigured()) return NextResponse.redirect(new URL('/auth/register?error=Layanan%20akun%20belum%20dikonfigurasi.', request.url), 303);
  const form = await readFormBody(request);
  const parsed = registerSchema.safeParse({ ...Object.fromEntries(form), acceptTerms: form.get('acceptTerms') === 'on' });
  if (!parsed.success) return NextResponse.redirect(new URL(`/auth/register?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? 'Data pendaftaran tidak valid.')}`, request.url), 303);
  const db = await createSupabaseServerClient();
  const { data, error } = await db.auth.signUp({ email: parsed.data.email, password: parsed.data.password, options: {
    data: { display_name: parsed.data.displayName }, emailRedirectTo: new URL('/auth/callback?next=/onboarding', request.url).href,
  } });
  if (error) return NextResponse.redirect(new URL('/auth/register?error=Pendaftaran%20belum%20berhasil.%20Periksa%20data%20atau%20coba%20lagi.', request.url), 303);
  return NextResponse.redirect(new URL(data.session ? '/onboarding' : '/auth/login?notice=Periksa%20email%20Anda%20untuk%20memverifikasi%20akun%20sebelum%20masuk.', request.url), 303);

  } catch (error) { return routeError(error); }
}
