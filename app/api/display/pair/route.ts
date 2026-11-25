import { routeError, readFormBody } from '@/lib/http';
import {NextResponse} from 'next/server';
import {pairDisplay} from '@/lib/db/display';
export async function POST(request:Request) {
  try {

  const form=await readFormBody(request);
  const result=await pairDisplay(String(form.get('code')??'').trim());
  if (!result.ok || !result.token) return NextResponse.redirect(new URL(`/tv?error=${encodeURIComponent(result.message??'Kode layar tidak valid.')}`,request.url),303);
  return NextResponse.redirect(new URL(`/display/${encodeURIComponent(result.token)}`,request.url),303);

  } catch (error) { return routeError(error); }
}
