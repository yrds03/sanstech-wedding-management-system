import * as demo from './demo-repository';
import { isLocalDemoEnabled } from '@/lib/config';
import { isSupabaseConfigured } from './supabase-browser';
import { createSupabaseServerClient } from './supabase-server';

type Operation = { [K in keyof typeof demo]: (typeof demo)[K] extends (...args: never[]) => unknown ? K : never }[keyof typeof demo];

function operation<K extends Operation>(name: K) {
  type F = Extract<(typeof demo)[K], (...args: never[]) => unknown>;
  return async (...args: Parameters<F>): Promise<ReturnType<F>> => {
    if (isSupabaseConfigured()) {
      const db = await createSupabaseServerClient();
      const { data, error } = await db.rpc('wms_repository', { p_action: name, p_args: args });
      if (error) {
        console.error('repository_operation_failed', { operation: name, code: error.code });
        throw new Error('Data tidak dapat diproses. Coba lagi atau hubungi pengelola aplikasi.');
      }
      return data as ReturnType<F>;
    }
    if (!isLocalDemoEnabled()) throw new Error('Layanan database belum dikonfigurasi.');
    const fn = demo[name] as (...params: Parameters<F>) => ReturnType<F>;
    return fn(...args);
  };
}

export const getUserProfileById = operation('getUserProfileById');
export const getAuthorizedWorkspacesForUser = operation('getAuthorizedWorkspacesForUser');
export const getWorkspaceIfAuthorized = operation('getWorkspaceIfAuthorized');
export const createWorkspaceForUser = operation('createWorkspaceForUser');
export const getAuthorizedEventsForWorkspace = operation('getAuthorizedEventsForWorkspace');
export const getAllAuthorizedEventsForUser = operation('getAllAuthorizedEventsForUser');
export const getEventIfAuthorized = operation('getEventIfAuthorized');
export const createEventInWorkspace = operation('createEventInWorkspace');
export const updateEventDetails = operation('updateEventDetails');
export const updateEventInvitationConfig = operation('updateEventInvitationConfig');
export const listInvitationGroupsForEvent = operation('listInvitationGroupsForEvent');
export const addInvitationGroupToEvent = operation('addInvitationGroupToEvent');
export const updateInvitationGroup = operation('updateInvitationGroup');
export const rotateInvitationGroupToken = operation('rotateInvitationGroupToken');
export const recordEventCheckinOrCorrection = operation('recordEventCheckinOrCorrection');
export const listCheckinLedgerForEvent = operation('listCheckinLedgerForEvent');
export const purgeEventTestingData = operation('purgeEventTestingData');
export const getPublicInvitationByToken = operation('getPublicInvitationByToken');
export const getEventTvPairingCode = operation('getEventTvPairingCode');
export const getDisplayScreenState = operation('getDisplayScreenState');
export const submitPublicRsvpByToken = operation('submitPublicRsvpByToken');
export const updateEventPlanByAdmin = operation('updateEventPlanByAdmin');
export const listMemberInvitesForEvent = operation('listMemberInvitesForEvent');
export const createEventMemberInvite = operation('createEventMemberInvite');
export const revokeEventMemberInvite = operation('revokeEventMemberInvite');
export const acceptMemberInviteByToken = operation('acceptMemberInviteByToken');
export const peekMemberInviteByToken = operation('peekMemberInviteByToken');
export const redeemMemberInviteToken = operation('redeemMemberInviteToken');
export const loginInvitedMemberByEmail = operation('loginInvitedMemberByEmail');
export const resolveMemberSimulationTarget = operation('resolveMemberSimulationTarget');
export const listAuditLogsForEvent = operation('listAuditLogsForEvent');
export const resetAllDataToZero = operation('resetAllDataToZero');

export async function importInvitationGroups(input: {userId:string;eventId:string;rows:Array<Omit<Parameters<typeof demo.addInvitationGroupToEvent>[0],'userId'|'eventId'>>}):Promise<{ok:boolean;error?:string;importedCount?:number}> {
  if(isSupabaseConfigured()) {
    const db=await createSupabaseServerClient();
    const {data,error}=await db.rpc('wms_repository',{p_action:'importInvitationGroups',p_args:[input]});
    if(error) return {ok:false,error:'Impor dibatalkan. Periksa seluruh data dan coba lagi.'};
    return data;
  }
  if(!isLocalDemoEnabled()) return {ok:false,error:'Layanan database belum tersedia.'};
  const event=demo.getEventIfAuthorized(input.userId,input.eventId);
  if(!event || event.planCode==='free') return {ok:false,error:'Impor tersedia pada paket Pro dan Pro Plus.'};
  let importedCount=0;
  for(const row of input.rows) {const result=demo.addInvitationGroupToEvent({...row,userId:input.userId,eventId:input.eventId});if('error' in result)return {ok:false,error:result.error};importedCount++;}
  return {ok:true,importedCount};
}
