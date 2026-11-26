import {NextResponse} from 'next/server';
import {isDriveConfigured, isGoogleAuthConfigured} from '@/lib/drive/config';
import {repositoryRpc} from '@/lib/db/rpc';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(){
 const headers={'Cache-Control':'no-store'};
 if(!isDriveConfigured())return NextResponse.json({status:'setup_required',storage:'google_drive',database:'not_configured'},{status:503,headers});
 try{
  await repositoryRpc('getPricingSettings',[]);
  if(!isGoogleAuthConfigured())return NextResponse.json({status:'setup_required',storage:'google_drive',database:'connected',auth:'not_configured'},{status:503,headers});
  return NextResponse.json({status:'ok',storage:'google_drive',database:'connected',auth:'google'},{headers});
 }catch{return NextResponse.json({status:'unavailable',storage:'google_drive',database:'unreachable'},{status:503,headers});}
}
