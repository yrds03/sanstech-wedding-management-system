import { routeError, readFormBody } from '@/lib/http';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { isSupabaseConfigured } from '@/lib/db/supabase-browser';
import { loginSchema } from '@/lib/validators';
import { safeRedirectPath } from '@/lib/config';
import { checkRateLimit, verifySameOriginMutation } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  try {

  if (!verifySameOriginMutation(request)) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Asal permintaan tidak sah.' } }, { status: 403 });
  if (!isSupabaseConfigured()) return NextResponse.redirect(new URL('/auth/login?error=Layanan%20akun%20belum%20dikonfigurasi.', request.url), 303);
  const limit = checkRateLimit({ key: `login:${request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local'}`, limit: 10, windowMs: 60_000 });
  if (!limit.allowed) return NextResponse.json({ error: { code: 'RATE_LIMITED', message: 'Terlalu banyak percobaan masuk. Tunggu satu menit.' } }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } });
  const form = await readFormBody(request);
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? 'Data masuk tidak valid.')}`, request.url), 303);
  const db = await createSupabaseServerClient();
  const { error } = await db.auth.signInWithPassword(parsed.data);
  if (error) return NextResponse.redirect(new URL('/auth/login?error=Email%20atau%20kata%20sandi%20tidak%20valid.%20Pastikan%20email%20sudah%20diverifikasi.', request.url), 303);
  return NextResponse.redirect(new URL(safeRedirectPath(form.get('redirectTo')), request.url), 303);

  } catch (error) { return routeError(error); }
}
