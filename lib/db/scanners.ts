import {isDriveConfigured} from '@/lib/drive/config';
import {repositoryRpc} from './rpc';
export interface ScannerSession {id:string;actorName:string;lastSeenAt:string;revoked:boolean;active:boolean}
export async function listScannerSessions(userId:string,eventId:string):Promise<ScannerSession[]>{
 if(!isDriveConfigured())return [];
 return repositoryRpc('listScannerSessions',[{userId,eventId}]);
}
export async function revokeScannerSession(userId:string,eventId:string,sessionId:string):Promise<boolean>{
 if(!isDriveConfigured())return false;
 return (await repositoryRpc<{ok:boolean}>('revokeScannerSession',[{userId,eventId,sessionId}])).ok===true;
}
