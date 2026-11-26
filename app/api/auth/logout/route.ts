import {routeError} from '@/lib/http';
import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {DEV_SESSION_COOKIE_NAME, SIMULATION_RETURN_COOKIE_NAME} from '@/lib/auth/session';
import {DRIVE_SESSION_COOKIE, GOOGLE_FLOW_COOKIE, isDriveConfigured} from '@/lib/drive/config';
import {driveDatabase} from '@/lib/drive/database';
import {verifySameOriginMutation} from '@/lib/security/rate-limit';
export async function POST(request: Request) {
  try {
    if (!verifySameOriginMutation(request)) return NextResponse.json({error: {code: 'FORBIDDEN', message: 'Asal permintaan tidak sah.'}}, {status: 403});
    const jar = await cookies();
    if (isDriveConfigured()) await driveDatabase.revoke(jar.get(DRIVE_SESSION_COOKIE)?.value);
    for (const name of [DRIVE_SESSION_COOKIE, GOOGLE_FLOW_COOKIE, DEV_SESSION_COOKIE_NAME, SIMULATION_RETURN_COOKIE_NAME]) jar.delete(name);
    return NextResponse.redirect(new URL('/auth/login', request.url), 303);
  } catch (error) { return routeError(error); }
}
