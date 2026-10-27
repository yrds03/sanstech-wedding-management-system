import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { UserProfile } from '@/lib/types';
import { DEMO_USERS, getUserProfileById } from '@/lib/db/repository';
import { isSupabaseConfigured } from '@/lib/db/supabase-browser';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';

export const DEV_SESSION_COOKIE_NAME = 'sanstech_dev_session_uid';

/**
 * Mengambil profil pengguna yang sedang masuk secara server-authoritative.
 * - Jika Supabase telah dikonfigurasi di `.env.local`, memeriksa sesi JWT dari Supabase Auth.
 * - Jika dalam pengembangan lokal tanpa kredensial Supabase (`NODE_ENV !== 'production'`),
 *   membaca cookie sesi pengembangan yang aman agar alur WO / Pengantin / Tenant B dapat diuji.
 */
export async function getCurrentUserServer(): Promise<UserProfile | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, phone_optional, is_platform_admin')
        .eq('user_id', user.id)
        .single();

      return {
        userId: user.id,
        email: user.email ?? '',
        displayName:
          profile?.display_name ??
          (user.user_metadata?.display_name as string | undefined) ??
          user.email ??
          'Pengguna SANSTECH',
        phoneOptional: profile?.phone_optional ?? undefined,
        isPlatformAdmin: Boolean(profile?.is_platform_admin),
      };
    } catch {
      return null;
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    const cookieStore = cookies();
    const devUid = cookieStore.get(DEV_SESSION_COOKIE_NAME)?.value;
    if (devUid && DEMO_USERS[devUid]) {
      return getUserProfileById(devUid);
    }
  }

  return null;
}

export async function requireAuthenticatedUser(redirectToPath?: string): Promise<UserProfile> {
  const user = await getCurrentUserServer();
  if (!user) {
    const target = redirectToPath
      ? `/auth/login?next=${encodeURIComponent(redirectToPath)}`
      : '/auth/login';
    redirect(target);
  }
  return user;
}

