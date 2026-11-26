import {PGlite} from '@electric-sql/pglite';
import {createHash, createHmac, randomUUID} from 'node:crypto';
import {createInterface} from 'node:readline/promises';
import {stdin, stdout} from 'node:process';
import {decryptSnapshot, encryptSnapshot, SNAPSHOT_FORMAT} from '../lib/drive/snapshot-crypto.mjs';

// Local owner-only maintenance tool. No arbitrary SQL or secret printing.
const email = process.argv[2]?.trim().toLowerCase();
const endpoint = process.env.DRIVE_GATEWAY_URL;
const secret = process.env.DRIVE_GATEWAY_SECRET;
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
 !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint ?? '') || (secret?.length ?? 0) < 32 || !/^[a-f0-9]{64}$/i.test(process.env.DRIVE_ENCRYPTION_KEY ?? '')) {
 console.error('Gunakan npm run drive:admin -- email@example.com dengan gateway/secret di .env.local.'); process.exit(1);
}
async function call(payload) {
 const message = JSON.stringify({...payload, timestamp: Date.now(), nonce: randomUUID()});
 const signature = createHmac('sha256', secret).update(message).digest('hex');
 let response = await fetch(endpoint, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({message, signature}), redirect: 'manual', signal: AbortSignal.timeout(15_000)});
 if ([301, 302, 303].includes(response.status)) {
  const location = new URL(response.headers.get('location') ?? '', endpoint);
  if (location.protocol !== 'https:' || location.hostname !== 'script.googleusercontent.com') throw new Error('Redirect gateway tidak sah.');
  response = await fetch(location, {redirect: 'error', signal: AbortSignal.timeout(15_000)});
 }
 if (!response.ok) throw new Error('Gateway belum dapat dihubungi.');
 const result = await response.json(); if (result.ok !== true) throw new Error('Gateway menolak operasi.'); return result;
}
try {
 const {snapshot} = await call({action: 'read'});
 if (!snapshot?.data || snapshot.format !== SNAPSHOT_FORMAT ||
  createHash('sha256').update(snapshot.data).digest('hex') !== snapshot.checksum) throw new Error('Database belum tersedia atau rusak.');
 const db = await PGlite.create({loadDataDir: new Blob([decryptSnapshot(snapshot.data, process.env.DRIVE_ENCRYPTION_KEY)])});
 try {
  const {rows} = await db.query(`SELECT u.id,u.email FROM auth.users u JOIN public.profiles p ON p.user_id=u.id WHERE lower(u.email)=$1 AND p.status='active'`, [email]);
  if (rows.length !== 1) throw new Error('Harus ada tepat satu akun aktif dengan email tersebut. Masuk melalui Google terlebih dahulu.');
  console.log('Akun target:', rows[0].id, rows[0].email);
  const prompt = createInterface({input: stdin, output: stdout});
  const answer = await prompt.question('Ketik GRANT untuk menetapkan akun ini sebagai admin platform: '); prompt.close();
  if (answer !== 'GRANT') throw new Error('Tidak ada perubahan.');
  await db.query('UPDATE public.profiles SET is_platform_admin=true WHERE user_id=$1', [rows[0].id]);
  await db.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata) VALUES($1::uuid,'platform.admin_granted','profile',$1::text,$2::jsonb)`, [rows[0].id, JSON.stringify({source: 'owner-maintenance-cli'})]);
  const data = encryptSnapshot(new Uint8Array(await (await db.dumpDataDir('gzip')).arrayBuffer()), process.env.DRIVE_ENCRYPTION_KEY);
  if (data.length > 8 * 1024 * 1024) throw new Error('Batas penyimpanan terlampaui.');
  const result = await call({action: 'commit', baseVersion: snapshot.version, data, checksum: createHash('sha256').update(data).digest('hex'), format: snapshot.format});
  if (result.committed !== true) throw new Error('Data berubah saat konfirmasi. Tidak ada data yang ditimpa; jalankan ulang.');
  console.log('Hak admin tersimpan.');
 } finally {await db.close();}
} catch (error) {console.error(error instanceof Error ? error.message : 'Operasi gagal.'); process.exitCode = 1;}
