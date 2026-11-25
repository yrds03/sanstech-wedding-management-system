import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { safeRedirectPath } from '@/lib/config';
import {isSupabaseConfigured} from '@/lib/db/supabase-browser';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (code && isSupabaseConfigured()) {
    const db = await createSupabaseServerClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeRedirectPath(url.searchParams.get('next')), request.url));
  }
  return NextResponse.redirect(new URL('/auth/login?error=Tautan%20verifikasi%20tidak%20berlaku.%20Minta%20tautan%20baru.', request.url));
}
