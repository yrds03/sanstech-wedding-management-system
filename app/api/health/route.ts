import {NextResponse} from 'next/server';
import {isSupabaseConfigured} from '@/lib/db/supabase-browser';
import {createSupabaseServerClient} from '@/lib/db/supabase-server';
export const dynamic='force-dynamic';
export async function GET(){
 const headers={'Cache-Control':'no-store'};
 if(!isSupabaseConfigured())return NextResponse.json({status:'setup_required',database:'not_configured'},{status:503,headers});
 try{const db=await createSupabaseServerClient();const{error}=await db.rpc('wms_repository',{p_action:'getPricingSettings',p_args:[]});
 if(error)return NextResponse.json({status:'setup_required',database:'migration_required_or_unreachable'},{status:503,headers});
 return NextResponse.json({status:'ok',database:'reachable'},{headers});
 }catch{return NextResponse.json({status:'unavailable',database:'unreachable'},{status:503,headers});}
}
