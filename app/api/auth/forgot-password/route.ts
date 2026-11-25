import { routeError, readFormBody } from '@/lib/http';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { isSupabaseConfigured } from '@/lib/db/supabase-browser';
import { verifySameOriginMutation } from '@/lib/security/rate-limit';
import { z } from 'zod';

export async function POST(request: Request) {
  try {

  if (!verifySameOriginMutation(request)) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Asal permintaan tidak sah.' } }, { status: 403 });
  if (!isSupabaseConfigured()) return NextResponse.redirect(new URL('/auth/forgot-password?error=Layanan%20akun%20belum%20dikonfigurasi.', request.url), 303);
  const form = await readFormBody(request);
  const email = z.string().trim().email().safeParse(form.get('email'));
  if (!email.success) return NextResponse.redirect(new URL('/auth/forgot-password?error=Alamat%20email%20tidak%20valid.', request.url), 303);
  const db = await createSupabaseServerClient();
  const { error } = await db.auth.resetPasswordForEmail(email.data, { redirectTo: new URL('/auth/callback?next=/auth/reset-password', request.url).href });
  if (error) return NextResponse.redirect(new URL('/auth/forgot-password?error=Pengiriman%20email%20belum%20berhasil.%20Coba%20lagi%20sebentar.', request.url), 303);
  return NextResponse.redirect(new URL('/auth/forgot-password?notice=Jika%20email%20terdaftar,%20tautan%20pemulihan%20akan%20dikirim.%20Periksa%20kotak%20masuk%20dan%20spam.', request.url), 303);

  } catch (error) { return routeError(error); }
}
