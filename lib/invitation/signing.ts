import crypto from 'crypto';
import {
  PortableInvitationPayload,
  sanitizeInvitationConfig,
} from '@/lib/invitation/config';
import type { InvitationConfig, PlanCode } from '@/lib/types';

/**
 * Tautan undangan dibuka dari HP tamu yang tidak memiliki sesi WO, sehingga konfigurasi desain
 * dibawa di parameter `c` (payload + tanda tangan HMAC). Tanda tangan mencegah pihak lain
 * mengubah isi undangan (mis. nomor rekening) pada domain SANSTECH.
 */
function signingKey(): string {
  return process.env.TOKEN_HASH_PEPPER ?? 'sanstech-weddinghub-default-dev-pepper';
}

function sign(payloadB64: string): string {
  return crypto
    .createHmac('sha256', `invitation-config:${signingKey()}`)
    .update(payloadB64)
    .digest('base64url')
    .slice(0, 32);
}

export function encodeInvitationConfig(config: InvitationConfig, plan: PlanCode): string {
  const payload: PortableInvitationPayload = { plan, config };
  const b64 = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  return `${b64}.${sign(b64)}`;
}

export function decodeInvitationConfig(
  encoded: string | undefined | null
): PortableInvitationPayload | null {
  if (!encoded) return null;
  const [b64, signature] = encoded.split('.');
  if (!b64 || !signature) return null;

  const expected = sign(b64);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(b64, 'base64url').toString('utf-8')) as PortableInvitationPayload;
    const plan: PlanCode = parsed.plan === 'pro' || parsed.plan === 'pro_plus' ? parsed.plan : 'free';
    return { plan, config: sanitizeInvitationConfig(parsed.config ?? {}, plan) };
  } catch {
    return null;
  }
}

export function buildInvitationPath(
  publicToken: string,
  config: InvitationConfig | undefined,
  plan: PlanCode
): string {
  const base = `/i/${publicToken}`;
  if (!config) return base;
  return `${base}?c=${encodeInvitationConfig(config, plan)}`;
}

