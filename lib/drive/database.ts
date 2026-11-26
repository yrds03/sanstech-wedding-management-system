import {PGlite, type Transaction} from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import type {UserProfile} from '@/lib/types';
import {RequestError} from '@/lib/http';
import {DriveSnapshotStore, type SnapshotStore, type Snapshot, checksum} from './transport';
import {decryptSnapshot, encryptSnapshot} from './snapshot-crypto.mjs';

export const hashSession = (token: string) => createHash('sha256').update(token).digest('hex');
const validSession = (token?: string) => Boolean(token && /^[A-Za-z0-9_-]{43}$/.test(token));
const readActions = new Set(['getPricingSettings', 'getUserProfileById', 'getAuthorizedWorkspacesForUser', 'getWorkspaceIfAuthorized',
  'getAuthorizedEventsForWorkspace', 'getAllAuthorizedEventsForUser', 'getEventIfAuthorized', 'listInvitationGroupsForEvent',
  'listCheckinLedgerForEvent', 'getPublicInvitationByToken', 'listMemberInvitesForEvent', 'peekMemberInviteByToken',
  'listAuditLogsForEvent', 'listScannerSessions', 'listVipNotifications']);

export async function initializeDatabase(db: PGlite, fresh: boolean) {
  if (fresh) await db.exec(fs.readFileSync(path.join(process.cwd(), 'database/drive-bootstrap.sql'), 'utf8'));
  const directory = path.join(process.cwd(), 'database/migrations');
  for (const name of fs.readdirSync(directory).filter(name => /^\d+_[a-z_]+\.sql$/.test(name)).sort()) {
    const existing = await db.query('SELECT name FROM public.wms_schema_migrations WHERE name=$1', [name]);
    if (existing.rows.length) continue;
    const sql = fs.readFileSync(path.join(directory, name), 'utf8').replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', '');
    await db.exec(sql);
    await db.query('INSERT INTO public.wms_schema_migrations(name) VALUES($1)', [name]);
  }
}

async function sessionProfile(tx: Transaction, token?: string): Promise<UserProfile | null> {
  if (!validSession(token)) return null;
  const result = await tx.query<UserProfile>(`SELECT u.id AS "userId",u.email,p.display_name AS "displayName",
    p.phone_optional AS "phoneOptional",p.is_platform_admin AS "isPlatformAdmin"
    FROM auth.sessions s JOIN auth.users u ON u.id=s.user_id JOIN public.profiles p ON p.user_id=u.id
    WHERE s.token_hash=$1 AND s.expires_at>NOW() AND p.status='active'`, [hashSession(token!)]);
  return result.rows[0] ?? null;
}

/** A process mutex protects the single-connection engine; Drive CAS protects different processes. */
export class DriveDatabase {
  private queue: Promise<unknown> = Promise.resolve();
  private cached?: {version: number; checksum: string | null; db: PGlite};
  private minimumVersion = 0;
  constructor(private readonly store: SnapshotStore = new DriveSnapshotStore()) {}

  private async invalidate() {
    const cached = this.cached;
    this.cached = undefined;
    if (cached) await cached.db.close();
  }

  private async load(snapshot: Snapshot) {
    if (snapshot.version < this.minimumVersion) throw new RequestError(503, 'STORAGE_ROLLBACK', 'Versi penyimpanan mundur. Hubungi pengelola sebelum melanjutkan.');
    this.minimumVersion = snapshot.version;
    if (this.cached?.version === snapshot.version && this.cached.checksum === snapshot.checksum) return this.cached.db;
    await this.invalidate();
    const db = await PGlite.create(snapshot.data ? {loadDataDir: new Blob([new Uint8Array(decryptSnapshot(snapshot.data, process.env.DRIVE_ENCRYPTION_KEY!))])} : {});
    try {await initializeDatabase(db, snapshot.data === null);}
    catch (error) {await db.close(); throw error;}
    this.cached = {version: snapshot.version, checksum: snapshot.checksum, db};
    return db;
  }

  private run<T>(write: boolean, work: (tx: Transaction) => Promise<T>): Promise<T> {
    const execute = async () => {
      for (let attempt = 0; attempt < 5; attempt++) {
        const snapshot = await this.store.read();
        try {
          const db = await this.load(snapshot);
          const result = await db.transaction(work);
          if (!write) return result;
          const dump = await db.dumpDataDir('gzip');
          const data = encryptSnapshot(new Uint8Array(await dump.arrayBuffer()), process.env.DRIVE_ENCRYPTION_KEY!);
          if (await this.store.commit(snapshot.version, data)) {
            this.cached = {version: snapshot.version + 1, checksum: checksum(data), db};
            this.minimumVersion = snapshot.version + 1;
            return result;
          }
          await this.invalidate();
        } catch (error) {await this.invalidate(); throw error;}
        await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * (attempt + 1) * 40));
      }
      throw new RequestError(409, 'CONCURRENT_UPDATE', 'Data sedang diperbarui petugas lain. Ulangi permintaan dengan kunci transaksi yang sama.');
    };
    const next = this.queue.then(execute, execute);
    this.queue = next.catch(() => undefined);
    return next;
  }

  close() {
    const next = this.queue.then(() => this.invalidate());
    this.queue = next.catch(() => undefined);
    return next;
  }

  profile(token?: string) {
    if (!validSession(token)) return Promise.resolve(null);
    return this.run(false, tx => sessionProfile(tx, token));
  }

  rpc<T>(action: string, args: unknown[], token?: string): Promise<T> {
    return this.run(!readActions.has(action), async tx => {
      const user = await sessionProfile(tx, token);
      await tx.exec(user ? 'SET LOCAL ROLE authenticated' : 'SET LOCAL ROLE anon');
      await tx.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [user?.userId ?? '']);
      const result = await tx.query<{value: T}>('SELECT public.wms_repository($1,$2::jsonb) AS value', [action, JSON.stringify(args)]);
      return result.rows[0]!.value;
    });
  }

  signIn(identity: {sub: string; email: string; name: string}, token: string): Promise<UserProfile> {
    if (!validSession(token)) throw new Error('Invalid session token');
    return this.run(true, async tx => {
      const existing = await tx.query<{id: string}>('SELECT id FROM auth.users WHERE google_sub=$1', [identity.sub]);
      const id = existing.rows[0]?.id ?? randomUUID();
      if (!existing.rows.length) await tx.query('INSERT INTO auth.users(id,google_sub,email,email_confirmed_at,raw_user_meta_data) VALUES($1,$2,$3,NOW(),$4::jsonb)',
        [id, identity.sub, identity.email, JSON.stringify({display_name: identity.name.slice(0, 80)})]);
      else await tx.query('UPDATE auth.users SET email=$2,email_confirmed_at=NOW() WHERE id=$1', [id, identity.email]);
      const profile = await tx.query<{status: string}>('SELECT status FROM public.profiles WHERE user_id=$1', [id]);
      if (profile.rows[0]?.status !== 'active') throw new RequestError(403, 'ACCOUNT_DISABLED', 'Akun tidak aktif. Hubungi pengelola.');
      await tx.query('DELETE FROM auth.sessions WHERE expires_at<=NOW()');
      await tx.query(`DELETE FROM auth.sessions WHERE token_hash IN (SELECT token_hash FROM auth.sessions WHERE user_id=$1 ORDER BY created_at DESC OFFSET 4)`, [id]);
      await tx.query("INSERT INTO auth.sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '7 days') ON CONFLICT(token_hash) DO NOTHING", [hashSession(token), id]);
      return (await sessionProfile(tx, token))!;
    });
  }

  revoke(token?: string) {
    if (!validSession(token)) return Promise.resolve();
    return this.run(true, async tx => { await tx.query('DELETE FROM auth.sessions WHERE token_hash=$1', [hashSession(token!)]); });
  }
}

const globalForDrive = globalThis as unknown as {__sanstechDriveDatabase?: DriveDatabase};
export const driveDatabase = globalForDrive.__sanstechDriveDatabase ??= new DriveDatabase();
