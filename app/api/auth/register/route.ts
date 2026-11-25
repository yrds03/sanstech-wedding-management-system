import { routeError, readFormBody } from '@/lib/http';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { isSupabaseConfigured } from '@/lib/db/supabase-browser';
import { registerSchema } from '@/lib/validators';
import { verifySameOriginMutation } from '@/lib/security/rate-limit';
import {safeRedirectPath} from '@/lib/config';

export async function POST(request: Request) {
  try {

  if (!verifySameOriginMutation(request)) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Asal permintaan tidak sah.' } }, { status: 403 });
  if (!isSupabaseConfigured()) return NextResponse.redirect(new URL('/auth/register?error=Layanan%20akun%20belum%20dikonfigurasi.', request.url), 303);
  const form = await readFormBody(request);
  const next=safeRedirectPath(form.get('redirectTo'),'/onboarding');
  const parsed = registerSchema.safeParse({ ...Object.fromEntries(form), acceptTerms: form.get('acceptTerms') === 'on' });
  if (!parsed.success) return NextResponse.redirect(new URL(`/auth/register?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? 'Data pendaftaran tidak valid.')}`, request.url), 303);
  const db = await createSupabaseServerClient();
  const callback=new URL('/auth/callback',request.url);callback.searchParams.set('next',next);
  const { data, error } = await db.auth.signUp({ email: parsed.data.email, password: parsed.data.password, options: {
    data: { display_name: parsed.data.displayName }, emailRedirectTo: callback.href,
  } });
  if (error) return NextResponse.redirect(new URL('/auth/register?error=Pendaftaran%20belum%20berhasil.%20Periksa%20data%20atau%20coba%20lagi.', request.url), 303);
  const destination=new URL(data.session?next:'/auth/login',request.url);
  if(!data.session){destination.searchParams.set('next',next);destination.searchParams.set('notice','Periksa email Anda untuk memverifikasi akun sebelum masuk.');}
  return NextResponse.redirect(destination,303);

  } catch (error) { return routeError(error); }
}
