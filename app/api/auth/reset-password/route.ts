import { routeError, readFormBody } from '@/lib/http';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { verifySameOriginMutation } from '@/lib/security/rate-limit';
import { z } from 'zod';

export async function POST(request: Request) {
  try {

  if (!verifySameOriginMutation(request)) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Asal permintaan tidak sah.' } }, { status: 403 });
  const form = await readFormBody(request);
  const parsed = z.object({ password: z.string().min(8).max(72), confirmPassword: z.string() }).refine(v=>v.password===v.confirmPassword).safeParse(Object.fromEntries(form));
  if (!parsed.success) return NextResponse.redirect(new URL('/auth/reset-password?error=Kata%20sandi%20minimal%208%20karakter%20dan%20konfirmasi%20harus%20sama.', request.url), 303);
  const db = await createSupabaseServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/auth/forgot-password?error=Sesi%20pemulihan%20berakhir.%20Minta%20tautan%20baru.', request.url), 303);
  const { error } = await db.auth.updateUser({ password: parsed.data.password });
  if (error) return NextResponse.redirect(new URL('/auth/reset-password?error=Kata%20sandi%20belum%20dapat%20diubah.%20Gunakan%20kata%20sandi%20baru%20yang%20kuat.', request.url), 303);
  await db.auth.signOut();
  return NextResponse.redirect(new URL('/auth/login?notice=Kata%20sandi%20berhasil%20diubah.%20Silakan%20masuk%20kembali.', request.url), 303);

  } catch (error) { return routeError(error); }
}
