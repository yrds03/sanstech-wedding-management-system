import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { DEV_SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { DEMO_USERS } from '@/lib/db/repository';
import { createAppError } from '@/lib/errors';

const EMAIL_TO_USER_ID: Record<string, string> = {
  'superadmin@sanstech.id': 'user-platform-admin',
  'admin@sanstech.id': 'user-platform-admin',
  'owner@sanstech-wo.id': 'user-wo-a',
  'andi.putri@contoh.id': 'user-couple-andi',
  'admin@lusiana-organizer.id': 'user-wo-b',
};

export async function POST(request: Request) {
  const formData = await request.formData();
  const explicitUserId = String(formData.get('userId') ?? '').trim();
  const emailInput = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const passwordInput = String(formData.get('password') ?? '').trim();
  let redirectPath = String(formData.get('redirectTo') ?? '/app/workspaces');

  let resolvedUserId = explicitUserId;

  // Jika login melalui form email & password utama
  if (emailInput) {
    if (EMAIL_TO_USER_ID[emailInput]) {
      resolvedUserId = EMAIL_TO_USER_ID[emailInput];
    } else {
      resolvedUserId = 'user-wo-a';
    }

    // Jika Super Admin login via form email, periksa kata sandi admin atau demo
    if (resolvedUserId === 'user-platform-admin') {
      const validAdminPass =
        passwordInput === 'SanstechAdmin#2026' ||
        passwordInput === 'sanstech-demo-password' ||
        passwordInput === 'admin12345';
      if (!validAdminPass) {
        return NextResponse.redirect(
          new URL(
            `/auth/login?error=${encodeURIComponent(
              'Kata sandi Super Admin salah. Gunakan: SanstechAdmin#2026'
            )}`,
            request.url
          ),
          303
        );
      }
      if (redirectPath === '/app/workspaces') {
        redirectPath = '/admin';
      }
    }
  }

  if (!resolvedUserId || !DEMO_USERS[resolvedUserId]) {
    return NextResponse.json(
      createAppError('VALIDATION_ERROR', 'Akun pengguna tidak ditemukan.'),
      { status: 400 }
    );
  }

  const cookieStore = cookies();
  cookieStore.set(DEV_SESSION_COOKIE_NAME, resolvedUserId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.redirect(new URL(redirectPath, request.url), 303);
}
