import {createHash, createHmac, randomUUID} from 'node:crypto';
import {RequestError} from '@/lib/http';
import {isDriveConfigured, MAX_SNAPSHOT_BYTES, SNAPSHOT_FORMAT} from './config';

export interface Snapshot {
  version: number;
  data: string | null;
  checksum: string | null;
  format: typeof SNAPSHOT_FORMAT;
}
export interface SnapshotStore {
  read(): Promise<Snapshot>;
  commit(baseVersion: number, data: string): Promise<boolean>;
}
export const checksum = (data: string) => createHash('sha256').update(data).digest('hex');

async function gatewayFetch(input: string | URL, init: RequestInit): Promise<Response> {
  try {return await fetch(input, init);}
  catch (error) {
    // DOMException.message is read-only. Normalize timeout/abort exceptions
    // before Next's server error formatter tries to annotate them.
    if (error instanceof Error && ['TimeoutError','AbortError'].includes(error.name))
      throw new RequestError(503,'DRIVE_UNAVAILABLE','Google Drive belum merespons. Silakan coba lagi sebentar.');
    throw error;
  }
}

/** Retries happen at the transaction layer, never as an unconditional file overwrite. */
export class DriveSnapshotStore implements SnapshotStore {
  private cachedSnapshot?: Snapshot;
  private async call(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!isDriveConfigured()) throw new RequestError(503, 'SETUP_REQUIRED', 'Penyimpanan Google Drive belum dikonfigurasi.');
    const message = JSON.stringify({...payload, timestamp: Date.now(), nonce: randomUUID()});
    const signature = createHmac('sha256', process.env.DRIVE_GATEWAY_SECRET!).update(message).digest('hex');
    const signal = AbortSignal.timeout(12_000);
    let response = await gatewayFetch(process.env.DRIVE_GATEWAY_URL!, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({message, signature}), cache: 'no-store', redirect: 'manual', signal,
    });
    // Apps Script ContentService redirects the result to Google's content host.
    if ([301, 302, 303].includes(response.status)) {
      const location = new URL(response.headers.get('location') ?? '', process.env.DRIVE_GATEWAY_URL);
      if (location.protocol !== 'https:' || location.hostname !== 'script.googleusercontent.com') throw new Error('Invalid Drive gateway redirect');
      response = await gatewayFetch(location, {cache: 'no-store', redirect: 'error', signal});
    }
    if (!response.ok) throw new RequestError(503, 'DRIVE_UNAVAILABLE', 'Google Drive belum dapat dihubungi. Coba lagi sebentar.');
    const text = await response.text();
    if (Buffer.byteLength(text) > MAX_SNAPSHOT_BYTES + 4096) throw new Error('Drive response exceeds storage limit');
    const result: unknown = JSON.parse(text);
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Invalid Drive gateway response');
    const value = result as Record<string, unknown>;
    if (value.ok !== true) throw new RequestError(503, 'DRIVE_UNAVAILABLE', 'Penyimpanan Google Drive belum dapat memproses permintaan.');
    return value;
  }

  async exchangeGoogleLogin(code: string, state: string, authNonce: string, verifier: string) {
    return this.call({action: 'exchange_auth_code', code, state, authNonce, verifier});
  }

  async read(): Promise<Snapshot> {
    const known = this.cachedSnapshot;
    const result = await this.call({action: 'read', ...(known ? {knownVersion:known.version,knownChecksum:known.checksum} : {})});
    if (result.unchanged === true) {
      if (!known || result.version !== known.version || result.checksum !== known.checksum || result.format !== SNAPSHOT_FORMAT) throw new Error('Invalid Drive version confirmation');
      return {...known};
    }
    const snapshot = result.snapshot as Snapshot | undefined;
    if (!snapshot || !Number.isSafeInteger(snapshot.version) || snapshot.version < 0 || snapshot.format !== SNAPSHOT_FORMAT ||
      (snapshot.data !== null && (typeof snapshot.data !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(snapshot.data) || checksum(snapshot.data) !== snapshot.checksum)) ||
      (snapshot.data === null && (snapshot.version !== 0 || snapshot.checksum !== null))) throw new Error('Invalid Drive snapshot');
    this.cachedSnapshot = {...snapshot};
    return snapshot;
  }

  async commit(baseVersion: number, data: string): Promise<boolean> {
    if (Buffer.byteLength(data) > MAX_SNAPSHOT_BYTES) throw new RequestError(507, 'STORAGE_LIMIT', 'Penyimpanan aplikasi mencapai batas. Hubungi pengelola untuk mengarsipkan data.');
    const result = await this.call({action: 'commit', baseVersion, data, checksum: checksum(data), format: SNAPSHOT_FORMAT});
    if (typeof result.committed !== 'boolean') throw new Error('Invalid Drive commit result');
    if (result.committed) this.cachedSnapshot = {version:baseVersion+1,data,checksum:checksum(data),format:SNAPSHOT_FORMAT};
    return result.committed;
  }
}
