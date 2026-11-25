import { createSupabaseServerClient } from './supabase-server';
import { isSupabaseConfigured } from './supabase-browser';
import { isLocalDemoEnabled } from '@/lib/config';
import { getDisplayScreenState } from './demo-repository';

export async function pairDisplay(code: string): Promise<{ok:boolean;token?:string;message?:string}> {
  if (!/^\d{6}$/.test(code)) return {ok:false,message:'Kode layar harus terdiri dari 6 angka.'};
  if (isSupabaseConfigured()) {
    const db = await createSupabaseServerClient();
    const {data,error} = await db.rpc('wms_repository',{p_action:'pairDisplay',p_args:[{code}]});
    if (error) return {ok:false,message:'Layar belum dapat dihubungkan. Coba lagi.'};
    return data;
  }
  if (isLocalDemoEnabled() && getDisplayScreenState(code)) return {ok:true,token:code};
  return {ok:false,message:'Kode layar tidak valid atau layanan belum tersedia.'};
}
export async function revokeDisplaySessions(userId:string,eventId:string) {
  if (!isSupabaseConfigured()) return {ok:false};
  const db=await createSupabaseServerClient();
  const {data,error}=await db.rpc('wms_repository',{p_action:'revokeDisplaySessions',p_args:[{userId,eventId}]});
  return error ? {ok:false} : data as {ok:boolean};
}
