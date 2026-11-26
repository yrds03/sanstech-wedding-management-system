import {cookies} from 'next/headers';
import {driveDatabase} from '@/lib/drive/database';
import {DRIVE_SESSION_COOKIE} from '@/lib/drive/config';
export async function repositoryRpc<T = unknown>(action: string, args: unknown[]): Promise<T> {
  const token = (await cookies()).get(DRIVE_SESSION_COOKIE)?.value;
  return driveDatabase.rpc<T>(action, args, token);
}
