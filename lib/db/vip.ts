import {createSupabaseServerClient} from './supabase-server';
import {isSupabaseConfigured} from './supabase-browser';
export interface VipNotification {id:string;displayName:string;tableLabel:string|null;status:'pending'|'seen'|'acknowledged';createdAt:string}
export async function listVipNotifications(userId:string,eventId:string):Promise<VipNotification[]>{
 if(!isSupabaseConfigured())return [];
 const db=await createSupabaseServerClient();const{data,error}=await db.rpc('wms_repository',{p_action:'listVipNotifications',p_args:[{userId,eventId}]});
 if(error)throw new Error('Notifikasi VIP belum dapat dimuat.');return data;
}
export async function ackVipNotification(userId:string,eventId:string,notificationId:string):Promise<boolean>{
 if(!isSupabaseConfigured())return false;
 const db=await createSupabaseServerClient();const{data,error}=await db.rpc('wms_repository',{p_action:'ackVipNotification',p_args:[{userId,eventId,notificationId}]});return !error && data?.ok===true;
}
