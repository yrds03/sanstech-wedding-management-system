import {isDriveConfigured} from '@/lib/drive/config';
import {repositoryRpc} from './rpc';
export interface VipNotification {id:string;displayName:string;tableLabel:string|null;status:'pending'|'seen'|'acknowledged';createdAt:string}
export async function listVipNotifications(userId:string,eventId:string):Promise<VipNotification[]>{
 if(!isDriveConfigured())return [];
 return repositoryRpc('listVipNotifications',[{userId,eventId}]);
}
export async function ackVipNotification(userId:string,eventId:string,notificationId:string):Promise<boolean>{
 if(!isDriveConfigured())return false;
 return (await repositoryRpc<{ok:boolean}>('ackVipNotification',[{userId,eventId,notificationId}])).ok===true;
}
