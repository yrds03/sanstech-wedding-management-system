import { routeError } from '@/lib/http';
import {NextResponse} from 'next/server';
import {getCurrentUserServer} from '@/lib/auth/session';
import {revokeDisplaySessions} from '@/lib/db/display';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  try {

  const user=await getCurrentUserServer();
  if(!user) return NextResponse.json({error:{code:'UNAUTHORIZED',message:'Silakan masuk.'}},{status:401});
  const {id}=await params;
  const result=await revokeDisplaySessions(user.userId,id);
  return NextResponse.redirect(new URL(`/app/e/${id}/display?${result.ok?'revoked=1':'error=Gagal%20mencabut%20sesi%20layar.'}`,request.url),303);

  } catch (error) { return routeError(error); }
}
