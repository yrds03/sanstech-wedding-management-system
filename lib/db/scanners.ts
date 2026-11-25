import {createSupabaseServerClient} from './supabase-server';
import {isSupabaseConfigured} from './supabase-browser';
export interface ScannerSession {id:string;actorName:string;lastSeenAt:string;revoked:boolean;active:boolean}
export async function listScannerSessions(userId:string,eventId:string):Promise<ScannerSession[]>{
 if(!isSupabaseConfigured())return [];
 const db=await createSupabaseServerClient();const{data,error}=await db.rpc('wms_repository',{p_action:'listScannerSessions',p_args:[{userId,eventId}]});
 if(error)throw new Error('Sesi scanner belum dapat dimuat.');return data;
}
export async function revokeScannerSession(userId:string,eventId:string,sessionId:string):Promise<boolean>{
 if(!isSupabaseConfigured())return false;
 const db=await createSupabaseServerClient();const{data,error}=await db.rpc('wms_repository',{p_action:'revokeScannerSession',p_args:[{userId,eventId,sessionId}]});return !error && data?.ok===true;
}
