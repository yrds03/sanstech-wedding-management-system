import {beforeEach, afterEach, describe, expect, it, vi} from 'vitest';
import vm from 'node:vm';
import fs from 'node:fs';
import {createHmac, createHash, randomUUID} from 'node:crypto';
import {createGoogleFlow, readGoogleFlow, googleAuthorizationUrl} from '@/lib/auth/google';
import {isApplicationConfigured} from '@/lib/drive/config';
import {DriveSnapshotStore} from '@/lib/drive/transport';
import {encryptSnapshot, decryptSnapshot} from '@/lib/drive/snapshot-crypto.mjs';

const secret = 'integration-test-only-32-characters-secret';
function gateway() {
 let contents = JSON.stringify({version: 0, data: null, checksum: null, format: 'sanstech-pglite-0.6.0-aes256gcm-gzip-v2'});
 let locked = false, editable = false;
 let statusRows: unknown[][] = [];
 const file = {getSharingPermission: () => editable ? 'edit' : 'view', getEditors: () => [], getViewers: () => [],
  getBlob: () => {expect(locked).toBe(true); return {getDataAsString: () => contents};}, setContent: (text: string) => {expect(locked).toBe(true); contents = text;}};
 const context = vm.createContext({Date, JSON, Number, PropertiesService: {getScriptProperties: () => ({getProperty: (key: string) => key === 'DRIVE_GATEWAY_SECRET' ? secret : 'file-id'})},
  LockService: {getScriptLock: () => ({tryLock: () => {locked = true; return true;}, hasLock: () => locked, releaseLock: () => {locked = false;}})},
  DriveApp: {getFileById: () => file, Access: {PRIVATE: 'private'}, Permission: {EDIT: 'edit'}},
  SpreadsheetApp: {flush: () => {}, openById: () => ({getSheetByName: () => ({getRange: () => ({getValue: () => 'SANSTECH_STORAGE_V2', setValues: (rows: unknown[][]) => {statusRows = rows;}})})})},
  Utilities: {Charset: {UTF_8: 'utf8'}, DigestAlgorithm: {SHA_256: 'sha256'},
   computeHmacSha256Signature: (message: string, key: string) => Array.from(createHmac('sha256', key).update(message).digest()),
   computeDigest: (_algorithm: string, message: string) => Array.from(createHash('sha256').update(message).digest())},
  ContentService: {MimeType: {JSON: 'json'}, createTextOutput: (text: string) => ({setMimeType: () => JSON.parse(text)})}});
 vm.runInContext(fs.readFileSync('google-apps-script/Code.gs', 'utf8'), context);
 return {request: (payload: Record<string, unknown>, key = secret) => {
  const message = JSON.stringify({timestamp: Date.now(), nonce: randomUUID(), ...payload});
  const signature = createHmac('sha256', key).update(message).digest('hex');
  return context.doPost({postData: {contents: JSON.stringify({message, signature})}});
 }, setEditable: () => {editable = true;}, corrupt: () => {contents = '{}';}, isLocked: () => locked, status: () => statusRows};
}

beforeEach(() => {
 vi.stubEnv('DRIVE_ENCRYPTION_KEY','ab'.repeat(32)); vi.stubEnv('DRIVE_GATEWAY_SECRET', secret); vi.stubEnv('DRIVE_GATEWAY_URL', 'https://script.google.com/macros/s/test-deployment/exec');
 vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client.apps.googleusercontent.com'); vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-client-secret');
});
afterEach(() => {vi.unstubAllEnvs(); vi.unstubAllGlobals();});

describe('Google Drive gateway security', () => {
 it('encrypts stored data and detects both tampering and the wrong key', () => {
  const plaintext = Buffer.from('private guest data');
  const encrypted = encryptSnapshot(plaintext, 'ab'.repeat(32));
  expect(Buffer.from(encrypted, 'base64').includes(plaintext)).toBe(false);
  expect(decryptSnapshot(encrypted, 'ab'.repeat(32))).toEqual(plaintext);
  expect(() => decryptSnapshot(encrypted, 'cd'.repeat(32))).toThrow();
  const tampered = Buffer.from(encrypted, 'base64'); tampered[tampered.length - 1]! ^= 1;
  expect(() => decryptSnapshot(tampered.toString('base64'), 'ab'.repeat(32))).toThrow();
 });
 it('commits only the expected version while holding the lock', () => {
  const server = gateway(); const data = Buffer.from('database-snapshot').toString('base64');
  const payload = {action: 'commit', baseVersion: 0, data, checksum: createHash('sha256').update(data).digest('hex'), format: 'sanstech-pglite-0.6.0-aes256gcm-gzip-v2'};
  expect(server.request(payload)).toEqual({ok: true, committed: true, sheetSynced: true});
  expect(JSON.stringify(server.status())).not.toContain(data);
  expect(server.request(payload)).toEqual({ok: true, committed: false});
  expect(server.request({action: 'read'}).snapshot.version).toBe(1);
  expect(server.isLocked()).toBe(false);
 });
 it('rejects forged, expired, corrupt and shared storage requests', () => {
  const server = gateway();
  expect(server.request({action: 'read'}, 'wrong-key').ok).toBe(false);
  expect(server.request({action: 'read', timestamp: Date.now() - 180_000}).ok).toBe(false);
  server.corrupt(); expect(server.request({action: 'read'}).ok).toBe(false);
  const shared = gateway(); shared.setEditable(); expect(shared.request({action: 'read'}).ok).toBe(false);
  expect(shared.isLocked()).toBe(false);
 });
 it('never follows a redirect to a third-party host', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 302, headers: {location: 'https://evil.example/collect'}})));
  await expect(new DriveSnapshotStore().read()).rejects.toThrow('Invalid Drive gateway redirect');
  expect(fetch).toHaveBeenCalledTimes(1);
 });
 it('rejects a mismatched checksum instead of opening corrupt data', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ok: true, snapshot: {version: 1, data: 'eA==', checksum: 'wrong', format: 'sanstech-pglite-0.6.0-aes256gcm-gzip-v2'}})));
  await expect(new DriveSnapshotStore().read()).rejects.toThrow('Invalid Drive snapshot');
 });
});

describe('Google OAuth flow binding', () => {
 it('binds state, nonce, PKCE and the safe destination to the signed cookie', () => {
  expect(isApplicationConfigured()).toBe(true);
  const {flow, cookie} = createGoogleFlow('/invite/private-token');
  expect(readGoogleFlow(cookie, flow.state)?.next).toBe('/invite/private-token');
  expect(readGoogleFlow(cookie, 'forged')).toBeNull();
  expect(readGoogleFlow(`${cookie}x`, flow.state)).toBeNull();
  const url = new URL(googleAuthorizationUrl(flow, 'https://example.com/auth/callback'));
  expect(url.hostname).toBe('accounts.google.com'); expect(url.searchParams.get('nonce')).toBe(flow.nonce);
  expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  expect(createGoogleFlow('https://evil.example').flow.next).toBe('/app/workspaces');
 });
 it('expires the flow after ten minutes', () => {
  vi.useFakeTimers();
  try {const {flow, cookie} = createGoogleFlow('/'); vi.advanceTimersByTime(600_001); expect(readGoogleFlow(cookie, flow.state)).toBeNull();}
  finally {vi.useRealTimers();}
 });
});
