import {isDriveConfigured} from '@/lib/drive/config';
import {repositoryRpc} from './rpc';
import { isLocalDemoEnabled } from '@/lib/config';
import { getDisplayScreenState } from './demo-repository';

export async function pairDisplay(code: string): Promise<{ok:boolean;token?:string;message?:string}> {
  if (!/^\d{6}$/.test(code)) return {ok:false,message:'Kode layar harus terdiri dari 6 angka.'};
  if (isDriveConfigured()) return repositoryRpc('pairDisplay', [{code}]);
  if (isLocalDemoEnabled() && getDisplayScreenState(code)) return {ok:true,token:code};
  return {ok:false,message:'Kode layar tidak valid atau layanan belum tersedia.'};
}
export async function revokeDisplaySessions(userId:string,eventId:string) {
  if (!isDriveConfigured()) return {ok:false};
  return repositoryRpc<{ok:boolean}>('revokeDisplaySessions', [{userId,eventId}]);
}
