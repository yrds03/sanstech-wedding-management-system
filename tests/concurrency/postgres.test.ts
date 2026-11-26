import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import EmbeddedPostgres from 'embedded-postgres';
import {Pool,type PoolClient} from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import net from 'node:net';

const owner='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const workspaceId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
let server:EmbeddedPostgres,pool:Pool;
interface Group {id:string;qrTokenPreview:string;publicTokenPreview:string;checkedInCount:number}
interface Result {id:string;ok:boolean;error?:string;errorCode?:string;group:Group;metrics:{invitationGroupsCount:number};createdNew:boolean;workspace:{id:string}}
async function actor<T>(id:string,fn:(client:PoolClient)=>Promise<T>){
 const client=await pool.connect();
 try{await client.query('BEGIN');await client.query('SET LOCAL ROLE authenticated');await client.query("SET LOCAL lock_timeout='8s';SET LOCAL statement_timeout='15s'");await client.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[id]);const result=await fn(client);await client.query('COMMIT');return result;}
 catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
async function call(client:PoolClient,action:string,...args:unknown[]):Promise<Result>{const response=await client.query<{value:Result}>('SELECT public.wms_repository($1,$2::jsonb) AS value',[action,JSON.stringify(args)]);return response.rows[0]!.value;}
const rpc=(action:string,...args:unknown[])=>actor(owner,client=>call(client,action,...args));
async function event(){return rpc('createEventInWorkspace',{userId:owner,workspaceId,title:'Acara Konkurensi',brideName:'Putri',groomName:'Andi',eventDate:'2099-12-20',startTime:'18:00',endTime:'21:00',timezone:'Asia/Jakarta',venue:'Ballroom',city:'Jakarta',address:'',status:'published'});}
async function guest(eventId:string,capacity=4){return (await rpc('addInvitationGroupToEvent',{userId:owner,eventId,displayName:'Keluarga Konkurensi',type:'family',capacity,guestCategory:'regular',allowedPublicDisplay:false})).group;}
beforeAll(async()=>{
 const socket=net.createServer();await new Promise<void>(resolve=>socket.listen(0,'127.0.0.1',resolve));const port=(socket.address() as net.AddressInfo).port;await new Promise<void>((resolve,reject)=>socket.close(error=>error?reject(error):resolve()));
 const directory=path.resolve('test-results','postgres',crypto.randomUUID());
 const password=crypto.randomBytes(32).toString('hex');
 server=new EmbeddedPostgres({databaseDir:directory,user:'postgres',password,port,persistent:true,autoRehydrateSymlinks:true,postgresFlags:['-h','127.0.0.1'],onLog:()=>{},onError:()=>{}});
 await server.initialise();await server.start();
 const client=server.getPgClient('postgres','127.0.0.1');await client.connect();
 pool=new Pool({host:'127.0.0.1',port,user:'postgres',password,database:'postgres',max:16});
 await client.query(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;
  CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb DEFAULT '{}');
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  GRANT USAGE ON SCHEMA auth TO anon,authenticated;GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;`);
 for(const file of fs.readdirSync('database/migrations').sort())await client.query(fs.readFileSync(path.join('database/migrations',file),'utf8'));
 await client.query("INSERT INTO auth.users(id,email,email_confirmed_at) VALUES($1,'owner@example.com',NOW()),($2,'other@example.com',NOW())",[owner,other]);
 await client.query("INSERT INTO workspaces(id,type,name,slug,owner_user_id) VALUES($1,'wo','Workspace Konkurensi','konkurensi',$2)",[workspaceId,owner]);
 await client.query("INSERT INTO workspace_memberships(workspace_id,user_id,role) VALUES($1,$2,'owner')",[workspaceId,owner]);await client.end();
});
afterAll(async()=>{if(pool)await pool.end();if(server)await server.stop();});
describe('real PostgreSQL 17 concurrent transactions',()=>{
 it('accepts only capacity-worth of simultaneous scans from independent connections',async()=>{
  const ev=await event(),g=await guest(ev.id,4),deviceKey=crypto.randomUUID();
  const results=await Promise.all(Array.from({length:12},()=>rpc('recordEventCheckinOrCorrection',{userId:owner,eventId:ev.id,groupIdOrQrToken:g.qrTokenPreview,deltaAttendees:1,method:'qr',deviceKey,idempotencyKey:crypto.randomUUID()})));
  expect(results.filter(result=>result.ok)).toHaveLength(4);
  const stored=await pool.query('SELECT sum(delta_attendees)::int AS total,count(*)::int AS count FROM checkin_entries WHERE invitation_group_id=$1',[g.id]);expect(stored.rows[0]).toEqual({total:4,count:4});
 });
 it('records one ledger row when the same request is retried simultaneously',async()=>{
  const ev=await event(),g=await guest(ev.id,4);const input={userId:owner,eventId:ev.id,groupIdOrQrToken:g.qrTokenPreview,deltaAttendees:2,method:'qr',deviceKey:crypto.randomUUID(),idempotencyKey:crypto.randomUUID()};
  const results=await Promise.all(Array.from({length:8},()=>rpc('recordEventCheckinOrCorrection',input)));expect(results.every(result=>result.ok)).toBe(true);
  const stored=await pool.query('SELECT sum(delta_attendees)::int AS total,count(*)::int AS count FROM checkin_entries WHERE invitation_group_id=$1',[g.id]);expect(stored.rows[0]).toEqual({total:2,count:1});
 });
 it('serializes RSVP with capacity changes so their final values cannot conflict',async()=>{
  const ev=await event(),g=await guest(ev.id,4);
  // Hold the same event lock from a separate connection so both operations genuinely overlap.
  const blocker=await pool.connect();await blocker.query('BEGIN');await blocker.query('SELECT id FROM events WHERE id=$1 FOR UPDATE',[ev.id]);
  const rsvp=actor(owner,c=>call(c,'submitPublicRsvpByToken',{rawToken:g.publicTokenPreview,rsvpStatus:'attending',attendeeCount:4}));
  const update=rpc('updateInvitationGroup',{userId:owner,eventId:ev.id,groupId:g.id,displayName:'Keluarga Konkurensi',type:'family',capacity:2,guestCategory:'regular',allowedPublicDisplay:false});
  let waiting=0;
  try{for(let attempt=0;attempt<100;attempt++){
   const locks=await pool.query("SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%wms_repository(%'");
   waiting=locks.rows[0].count;if(waiting>=2)break;await new Promise(resolve=>setTimeout(resolve,20));
  }}finally{await blocker.query('COMMIT');blocker.release();}
  await Promise.all([rsvp,update]);expect(waiting).toBeGreaterThanOrEqual(2);
  const result=await pool.query('SELECT g.capacity,COALESCE(r.attendee_count,0) AS count FROM invitation_groups g LEFT JOIN rsvps r ON r.invitation_group_id=g.id WHERE g.id=$1',[g.id]);expect(result.rows[0].count).toBeLessThanOrEqual(result.rows[0].capacity);
 });
 it('does not overbook scanner slots during simultaneous device registration',async()=>{
  const ev=await event(),g=await guest(ev.id,10);
  const results=await Promise.all(Array.from({length:5},()=>rpc('recordEventCheckinOrCorrection',{userId:owner,eventId:ev.id,groupIdOrQrToken:g.qrTokenPreview,deltaAttendees:1,method:'qr',deviceKey:crypto.randomUUID(),idempotencyKey:crypto.randomUUID()})));
  expect(results.filter(result=>result.ok)).toHaveLength(1);
  const sessions=await pool.query('SELECT count(*)::int AS count FROM scanner_sessions WHERE event_id=$1',[ev.id]);expect(sessions.rows[0].count).toBe(1);
 });
 it('keeps onboarding idempotent when requests arrive on different connections',async()=>{
  const payload={userId:owner,type:'wo',name:'Cabang Konkuren',slug:'cabang-konkuren',idempotencyKey:crypto.randomUUID()};
  const results=await Promise.all(Array.from({length:8},()=>rpc('createWorkspaceForUser',payload)));
  expect(new Set(results.map(result=>result.workspace.id)).size).toBe(1);expect(results.filter(result=>result.createdNew)).toHaveLength(1);
 });
});
