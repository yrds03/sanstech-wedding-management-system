import {PGlite} from '@electric-sql/pglite';
import {createHash, createHmac, randomUUID} from 'node:crypto';
import {decryptSnapshot, SNAPSHOT_FORMAT} from '../lib/drive/snapshot-crypto.mjs';

// Read-only production audit. Never creates users/events, runs migrations or commits.
async function main() {
  const {DRIVE_GATEWAY_URL:endpoint, DRIVE_GATEWAY_SECRET:secret, DRIVE_ENCRYPTION_KEY:key} = process.env;
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint ?? '') ||
    (secret?.length ?? 0) < 32 || !/^[a-f0-9]{64}$/i.test(key ?? '')) throw new Error('Konfigurasi audit Drive belum lengkap.');
  const message=JSON.stringify({action:'read',timestamp:Date.now(),nonce:randomUUID()});
  const signature=createHmac('sha256',secret).update(message).digest('hex');
  const signal=AbortSignal.timeout(30000);
  let response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,signature}),redirect:'manual',signal});
  if ([301,302,303].includes(response.status)) {
    const url=new URL(response.headers.get('location') ?? '',endpoint);
    if(url.protocol!=='https:' || url.hostname!=='script.googleusercontent.com')throw new Error('Redirect audit tidak sah.');
    response=await fetch(url,{redirect:'error',signal});
  }
  if(!response.ok)throw new Error('Drive belum dapat dibaca.');
  const {ok,snapshot}=await response.json();
  if(ok!==true || !snapshot?.data || snapshot.format!==SNAPSHOT_FORMAT ||
    createHash('sha256').update(snapshot.data).digest('hex')!==snapshot.checksum)throw new Error('Snapshot audit tidak valid.');
  const db=await PGlite.create({loadDataDir:new Blob([decryptSnapshot(snapshot.data,key)])});
  try {
    const {rows}=await db.query(`SELECT
      (SELECT count(*)::int FROM auth.users) AS users,
      (SELECT count(*)::int FROM public.workspaces) AS workspaces,
      (SELECT count(*)::int FROM public.events) AS events,
      (SELECT count(*)::int FROM public.invitation_groups) AS invitation_groups,
      (SELECT count(*)::int FROM public.rsvps) AS rsvps,
      (SELECT count(*)::int FROM public.checkin_entries) AS checkin_entries,
      (SELECT count(*)::int FROM public.member_invites) AS member_invites,
      (SELECT count(*)::int FROM public.display_sessions) AS display_sessions`);
    console.log(JSON.stringify({readOnly:true,snapshotVersion:snapshot.version,snapshotBytes:snapshot.data.length,counts:rows[0]},null,2));
  } finally {await db.close();}
}
main().catch(error=>{console.error(error instanceof Error ? error.message : 'Audit gagal.');process.exitCode=1;});
