import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { UserProfile } from '@/lib/types';
import { DEMO_USERS, getUserProfileById } from '@/lib/db/demo-repository';
import { readDemoSession } from './demo-session';
import { isSupabaseConfigured } from '@/lib/db/supabase-browser';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';

export const DEV_SESSION_COOKIE_NAME = 'sanstech_dev_session_uid';
/** Menyimpan akun pemilik/WO saat sedang menyimulasikan peran anggota tim. */
export const SIMULATION_RETURN_COOKIE_NAME = 'sanstech_sim_return_uid';

/**
 * Mengambil profil pengguna yang sedang masuk secara server-authoritative.
 * - Jika Supabase telah dikonfigurasi, memeriksa sesi JWT dari Supabase Auth.
 * - Sesi simulasi bertanda tangan hanya diterima pada pengembangan lokal yang diaktifkan.
 * - Produksi tanpa konfigurasi tidak menggunakan akun atau data simulasi sebagai fallback.
 */
export async function getCurrentUserServer(): Promise<UserProfile | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, phone_optional, is_platform_admin, status')
        .eq('user_id', user.id)
        .single();

      if (!profile || profile.status !== 'active') return null;
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

  const cookieStore = await cookies();
  const devUid = readDemoSession(cookieStore.get(DEV_SESSION_COOKIE_NAME)?.value);
  if (devUid) {
    const profile = getUserProfileById(devUid) ?? DEMO_USERS[devUid] ?? null;
    if (profile) return profile;
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
