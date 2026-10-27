import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { DEV_SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { isSupabaseConfigured } from '@/lib/db/supabase-browser';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';

export async function POST(request: Request) {
  const cookieStore = cookies();
  cookieStore.delete(DEV_SESSION_COOKIE_NAME);

  if (isSupabaseConfigured()) {
    try {
      const supabase = createSupabaseServerClient();
      await supabase.auth.signOut();
    } catch {
      // Abaikan jika gagal signOut di sisi upstream
    }
  }

  return NextResponse.redirect(new URL('/auth/login', request.url), 303);
}
