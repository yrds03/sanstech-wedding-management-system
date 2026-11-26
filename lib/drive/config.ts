/** Only server code reads the gateway and OAuth secrets. */
export const DRIVE_SESSION_COOKIE = 'sanstech_session';
export const GOOGLE_FLOW_COOKIE = 'sanstech_google_flow';
export {SNAPSHOT_FORMAT} from './snapshot-crypto.mjs';
export const MAX_SNAPSHOT_BYTES = 8 * 1024 * 1024;

export function isDriveConfigured(): boolean {
  return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(process.env.DRIVE_GATEWAY_URL ?? '') &&
    (process.env.DRIVE_GATEWAY_SECRET?.length ?? 0) >= 32 && /^[a-f0-9]{64}$/i.test(process.env.DRIVE_ENCRYPTION_KEY ?? '');
}

export function isGoogleAuthConfigured(): boolean {
  return isGoogleScriptAuthConfigured() || (/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(process.env.GOOGLE_CLIENT_ID ?? '') &&
    Boolean(process.env.GOOGLE_CLIENT_SECRET));
}

export function isGoogleScriptAuthConfigured(): boolean {
  return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(process.env.GOOGLE_AUTH_SCRIPT_URL ?? '') &&
    /^[A-Za-z0-9_-]{40,100}$/.test(process.env.GOOGLE_AUTH_SCRIPT_ID ?? '');
}

export function isApplicationConfigured(): boolean {
  return isDriveConfigured() && isGoogleAuthConfigured();
}
