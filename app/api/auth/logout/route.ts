import { routeError } from '@/lib/http';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { DEV_SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { isSupabaseConfigured } from '@/lib/db/supabase-browser';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { verifySameOriginMutation } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  try {

  if (!verifySameOriginMutation(request)) return NextResponse.json({error:{code:'FORBIDDEN',message:'Asal permintaan tidak sah.'}},{status:403});
  const cookieStore = await cookies();
  cookieStore.delete(DEV_SESSION_COOKIE_NAME);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    } catch {
      // Abaikan jika gagal signOut di sisi upstream
    }
  }

  return NextResponse.redirect(new URL('/auth/login', request.url), 303);

  } catch (error) { return routeError(error); }
}

