import crypto from 'node:crypto';
import { isLocalDemoEnabled } from '@/lib/config';

const localState=globalThis as typeof globalThis & {__wmsDemoSigningKey?:Buffer};
const key=localState.__wmsDemoSigningKey??(localState.__wmsDemoSigningKey=crypto.randomBytes(32));
export function signDemoSession(userId: string): string {
  if (!isLocalDemoEnabled()) throw new Error('Simulasi hanya tersedia secara lokal.');
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  return `${payload}.${crypto.createHmac('sha256', key).update(payload).digest('base64url')}`;
}
export function readDemoSession(value: string | undefined): string | null {
  if (!isLocalDemoEnabled() || !value || value.length > 1024) return null;
  try {
    const parts = value.split('.');
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    if (!payload || !signature) return null;
    const expected = crypto.createHmac('sha256', key).update(payload).digest();
    const received = Buffer.from(signature, 'base64url');
    if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return null;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof parsed.userId === 'string' && parsed.expiresAt > Date.now() ? parsed.userId : null;
  } catch { return null; }
}
