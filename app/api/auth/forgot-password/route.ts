import {NextResponse} from 'next/server';
import {verifySameOriginMutation} from '@/lib/security/rate-limit';
export async function POST(request: Request) {
  if (!verifySameOriginMutation(request)) return NextResponse.json({error: {code: 'FORBIDDEN', message: 'Asal permintaan tidak sah.'}}, {status: 403});
  return NextResponse.redirect(new URL('/auth/forgot-password', request.url), 303);
}
