import {NextResponse} from 'next/server';
import {getCurrentUserServer} from '@/lib/auth/session';
import {ackVipNotification} from '@/lib/db/vip';
import {readFormBody,routeError} from '@/lib/http';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 try{const user=await getCurrentUserServer();if(!user)return NextResponse.json({error:{code:'UNAUTHORIZED',message:'Silakan masuk.'}},{status:401});
 const{id}=await params;const form=await readFormBody(request);const ok=await ackVipNotification(user.userId,id,String(form.get('notificationId')??''));
 if(!ok)return NextResponse.json({error:{code:'FORBIDDEN',message:'Notifikasi tidak dapat diperbarui.'}},{status:403});return NextResponse.redirect(new URL(`/app/e/${id}/vip`,request.url),303);
 }catch(error){return routeError(error);}
}
