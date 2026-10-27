import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { DEV_SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { DEMO_USERS } from '@/lib/db/repository';
import { createAppError, getHttpStatusForError } from '@/lib/errors';

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      createAppError('FORBIDDEN', 'Login akun demo hanya tersedia pada mode pengembangan lokal.'),
      { status: getHttpStatusForError('FORBIDDEN') }
    );
  }

  const formData = await request.formData();
  const userId = String(formData.get('userId') ?? '');
  const redirectPath = String(formData.get('redirectTo') ?? '/app/workspaces');

  if (!DEMO_USERS[userId]) {
    return NextResponse.json(
      createAppError('VALIDATION_ERROR', 'Akun uji coba tidak ditemukan.'),
      { status: 400 }
    );
  }

  const cookieStore = cookies();
  cookieStore.set(DEV_SESSION_COOKIE_NAME, userId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.redirect(new URL(redirectPath, request.url), 303);
}
