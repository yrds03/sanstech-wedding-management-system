import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { UserProfile } from '@/lib/types';
import { DEMO_USERS, getUserProfileById } from '@/lib/db/demo-repository';
import { readDemoSession } from './demo-session';
import {isDriveConfigured, DRIVE_SESSION_COOKIE} from '@/lib/drive/config';
import {driveDatabase} from '@/lib/drive/database';
import {cache} from 'react';

export const DEV_SESSION_COOKIE_NAME = 'sanstech_dev_session_uid';
/** Menyimpan akun pemilik/WO saat sedang menyimulasikan peran anggota tim. */
export const SIMULATION_RETURN_COOKIE_NAME = 'sanstech_sim_return_uid';

/** Validated against the private Drive database on the server. */
export const getCurrentUserServer = cache(async (): Promise<UserProfile | null> => {
  if (isDriveConfigured()) return driveDatabase.profile((await cookies()).get(DRIVE_SESSION_COOKIE)?.value);

  const cookieStore = await cookies();
  const devUid = readDemoSession(cookieStore.get(DEV_SESSION_COOKIE_NAME)?.value);
  if (devUid) {
    const profile = getUserProfileById(devUid) ?? DEMO_USERS[devUid] ?? null;
    if (profile) return profile;
  }

  return null;
});

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
