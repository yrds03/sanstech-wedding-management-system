import {createHmac, randomBytes, createHash, timingSafeEqual} from 'node:crypto';
import {createRemoteJWKSet, jwtVerify} from 'jose';
import {safeRedirectPath} from '@/lib/config';
import {isApplicationConfigured} from '@/lib/drive/config';
import {RequestError} from '@/lib/http';

interface GoogleFlow {state: string; nonce: string; verifier: string; next: string; issuedAt: number}
const keys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'), {timeoutDuration: 10_000});
const sign = (body: string) => createHmac('sha256', process.env.DRIVE_GATEWAY_SECRET!).update(`google-flow:${body}`).digest('base64url');

export function createGoogleFlow(next: unknown): {flow: GoogleFlow; cookie: string} {
  const flow: GoogleFlow = {state: randomBytes(32).toString('base64url'), nonce: randomBytes(32).toString('base64url'),
    verifier: randomBytes(32).toString('base64url'), next: safeRedirectPath(next), issuedAt: Date.now()};
  const body = Buffer.from(JSON.stringify(flow)).toString('base64url');
  return {flow, cookie: `${body}.${sign(body)}`};
}

export function readGoogleFlow(cookie: string | undefined, state: string | null): GoogleFlow | null {
  if (!cookie || cookie.length > 4096 || !state) return null;
  try {
    const [body, signature, extra] = cookie.split('.');
    if (!body || !signature || extra) return null;
    const expected = Buffer.from(sign(body)), actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const flow = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as GoogleFlow;
    if (flow.state !== state || !/^[A-Za-z0-9_-]{43}$/.test(flow.nonce) || !/^[A-Za-z0-9_-]{43}$/.test(flow.verifier) ||
      !Number.isSafeInteger(flow.issuedAt) || flow.issuedAt > Date.now() || Date.now() - flow.issuedAt > 600_000) return null;
    return {...flow, next: safeRedirectPath(flow.next)};
  } catch { return null; }
}

export function googleAuthorizationUrl(flow: GoogleFlow, callback: string): string {
  if (!isApplicationConfigured()) throw new RequestError(503, 'SETUP_REQUIRED', 'Layanan Google belum dikonfigurasi oleh pengelola.');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: callback, response_type: 'code',
    scope: 'openid email profile', state: flow.state, nonce: flow.nonce,
    code_challenge: createHash('sha256').update(flow.verifier).digest('base64url'), code_challenge_method: 'S256', prompt: 'select_account'}).toString();
  return url.href;
}

export async function exchangeGoogleCode(code: string, flow: GoogleFlow, callback: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}, cache: 'no-store', signal: AbortSignal.timeout(10_000),
    body: new URLSearchParams({grant_type: 'authorization_code', code, client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: callback, code_verifier: flow.verifier})});
  if (!response.ok) throw new Error('Google code exchange failed');
  const result: unknown = await response.json();
  if (!result || typeof result !== 'object' || !('id_token' in result) || typeof result.id_token !== 'string') throw new Error('Missing Google identity token');
  const {payload} = await jwtVerify(result.id_token, keys, {issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: process.env.GOOGLE_CLIENT_ID!, algorithms: ['RS256'], requiredClaims: ['sub', 'email', 'email_verified', 'nonce', 'exp', 'iat']});
  if (payload.nonce !== flow.nonce || payload.email_verified !== true || typeof payload.email !== 'string' ||
    !payload.sub || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email) || payload.email.length > 320 ||
    (payload.azp !== undefined && payload.azp !== process.env.GOOGLE_CLIENT_ID)) throw new Error('Invalid Google identity');
  return {sub: payload.sub, email: payload.email.toLowerCase(), name: typeof payload.name === 'string' && payload.name.trim().length >= 2 ? payload.name.trim().slice(0, 80) : 'Pengguna SANSTECH'};
}
