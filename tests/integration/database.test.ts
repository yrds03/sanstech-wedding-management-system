import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import type { WorkspaceSummary,InvitationGroupDetail,EventSummary,MemberInviteItem } from '@/lib/types';

const db = new PGlite();
const owner='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const staff='33333333-3333-4333-8333-333333333333';
let eventId:string,workspaceId:string,groupId:string,qr:string,publicToken:string;
async function actor(id:string){ await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id]); }
interface RpcResult { id:string;createdNew:boolean;workspace:WorkspaceSummary;group:InvitationGroupDetail;planCode:string;metrics:EventSummary['metrics'];myEffectiveRole:string;ok:boolean;errorCode:string;invite:MemberInviteItem;rawToken:string;[index:number]:InvitationGroupDetail }
async function rpc(action:string,...args:unknown[]):Promise<RpcResult>{
  const result=await db.query<{value:unknown}>('SELECT public.wms_repository($1,$2::jsonb) AS value',[action,JSON.stringify(args)]);
  return result.rows[0]!.value as RpcResult;
}
beforeAll(async()=>{
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon,authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;`);
  for(const f of fs.readdirSync('supabase/migrations').sort()) {
    // pgcrypto extension is not needed by these migrations; UUID and SHA256 are PostgreSQL built-ins.
    await db.exec(fs.readFileSync(`supabase/migrations/${f}`,'utf8').replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";',''));
  }
  await db.query("INSERT INTO auth.users(id,email,email_confirmed_at) VALUES($1,'owner@example.com',NOW()),($2,'other@example.com',NOW()),($3,'staff@example.com',NOW())",[owner,other,staff]);
  await actor(owner);
},120000);
afterAll(async()=>{await db.close();});

describe('production PostgreSQL repository',()=>{
 it('creates verified profiles and an idempotent workspace',async()=>{
  const input={userId:owner,type:'wo',name:'Acara Uji',slug:'acara-uji',idempotencyKey:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'};
  const first=await rpc('createWorkspaceForUser',input),again=await rpc('createWorkspaceForUser',input);
  expect(first.createdNew).toBe(true);expect(again.createdNew).toBe(false);
  expect(first.workspace.id).toBe(again.workspace.id);workspaceId=first.workspace.id;
 });
 it('does not self-activate paid plans or authorize another tenant',async()=>{
  const event=await rpc('createEventInWorkspace',{userId:owner,workspaceId,title:'Pernikahan Uji',brideName:'Putri',groomName:'Andi',eventDate:'2027-12-20',startTime:'18:00',endTime:'21:00',timezone:'Asia/Jakarta',venue:'Ballroom',city:'Jakarta',address:'',status:'published',planCode:'pro_plus'});
  expect(event.planCode).toBe('free');eventId=event.id;
  await actor(other);expect(await rpc('getEventIfAuthorized',other,eventId)).toBeNull();
  expect(await rpc('getWorkspaceIfAuthorized',other,workspaceId)).toBeNull();
  await expect(rpc('getEventIfAuthorized',owner,eventId)).rejects.toThrow();await actor(owner);
 });
 it('persists separate opaque guest tokens and rejects forged portable invitations',async()=>{
  const created=await rpc('addInvitationGroupToEvent',{userId:owner,eventId,displayName:'Keluarga Budi',type:'family',capacity:4,guestCategory:'vip',allowedPublicDisplay:false,notesPrivateOptional:'RAHASIA',phoneOptional:'08123456789'});
  expect(created.group.capacity).toBe(4);groupId=created.group.id;qr=created.group.qrTokenPreview;publicToken=created.group.publicTokenPreview;
  expect(qr).not.toBe(publicToken);expect(qr.length).toBeGreaterThanOrEqual(32);
  await actor('');const publicData=await rpc('getPublicInvitationByToken',publicToken);
  expect(publicData.group.displayName).toBe('Keluarga Budi');expect(publicData.group.notesPrivateOptional).toBeUndefined();expect(publicData.group.phoneOptional).toBeUndefined();
  expect(await rpc('getPublicInvitationByToken','inv.fake-payload')).toBeNull();await actor(owner);
 });
 it('keeps RSVP separate from attendance and validates counts',async()=>{
  await actor('');
  expect((await rpc('submitPublicRsvpByToken',{rawToken:publicToken,rsvpStatus:'attending',attendeeCount:5})).ok).toBe(false);
  expect((await rpc('submitPublicRsvpByToken',{rawToken:publicToken,rsvpStatus:'attending',attendeeCount:3})).ok).toBe(true);
  await actor(owner);const ev=await rpc('getEventIfAuthorized',owner,eventId);
  expect(ev.metrics.rsvpAttendingCount).toBe(3);expect(ev.metrics.checkedInPersonsCount).toBe(0);
 });
 it('serializes check-ins, handles replay, detects conflicting replay, and enforces capacity',async()=>{
  const input={userId:owner,eventId,groupIdOrQrToken:qr,deltaAttendees:2,method:'qr',idempotencyKey:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',deviceKey:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'};
  expect((await rpc('recordEventCheckinOrCorrection',input)).ok).toBe(true);
  expect((await rpc('recordEventCheckinOrCorrection',input)).group.checkedInCount).toBe(2);
  expect((await rpc('recordEventCheckinOrCorrection',{...input,deltaAttendees:1})).errorCode).toBe('IDEMPOTENCY_CONFLICT');
  expect((await rpc('recordEventCheckinOrCorrection',{...input,idempotencyKey:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'})).group.checkedInCount).toBe(4);
  expect((await rpc('recordEventCheckinOrCorrection',{...input,deltaAttendees:1,idempotencyKey:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'})).errorCode).toBe('CAPACITY_EXCEEDED');
 });
 it('requires an authenticated verified recipient before granting membership and supports revocation',async()=>{
  const created=await rpc('createEventMemberInvite',{actorUserId:owner,eventId,recipientEmail:'staff@example.com',eventRoleGrant:'receptionist'});
  await actor(other);expect((await rpc('acceptMemberInviteByToken',{userId:other,rawToken:created.rawToken})).ok).toBe(false);
  await actor(staff);expect((await rpc('acceptMemberInviteByToken',{userId:staff,rawToken:created.rawToken})).ok).toBe(true);
  expect((await rpc('getEventIfAuthorized',staff,eventId)).myEffectiveRole).toBe('receptionist');
  expect((await rpc('revokeEventMemberInvite',{actorUserId:staff,eventId,inviteId:created.invite.id})).ok).toBe(false);
  const guests=await rpc('listInvitationGroupsForEvent',staff,eventId);expect(guests[0]!.notesPrivateOptional).toBeUndefined();expect(guests[0]!.phoneOptional).toBeUndefined();
  await actor(owner);expect((await rpc('revokeEventMemberInvite',{actorUserId:owner,eventId,inviteId:created.invite.id})).ok).toBe(true);
  await actor(staff);expect(await rpc('getEventIfAuthorized',staff,eventId)).toBeNull();await actor(owner);
 });
 it('rotates both tokens and invalidates the old public link',async()=>{
  expect((await rpc('rotateInvitationGroupToken',{userId:owner,eventId,groupId})).ok).toBe(true);
  expect(await rpc('getPublicInvitationByToken',publicToken)).toBeNull();
 });
 it('prevents shrinking a guest below attendance or RSVP',async()=>{
  const update={userId:owner,eventId,groupId,displayName:'Keluarga Budi',type:'family',capacity:2,guestCategory:'vip',allowedPublicDisplay:false};
  expect((await rpc('updateInvitationGroup',update)).ok).toBe(false);
  expect((await rpc('updateInvitationGroup',{...update,capacity:4,displayName:'Budi & Keluarga'})).ok).toBe(true);
 });
 it('refuses unknown display sessions and paid displays on Free',async()=>{
  await actor('');expect(await rpc('getDisplayScreenState','unknown')).toBeNull();
  expect(await rpc('getDisplayScreenState',eventId)).toBeNull();
  await actor(owner);expect(await rpc('getEventTvPairingCode',eventId)).toBeNull();
 });
 it('denies direct table privilege escalation and direct unchecked RPC access',async()=>{
  await db.exec('SET ROLE authenticated');
  await expect(db.query('UPDATE public.profiles SET is_platform_admin=true WHERE user_id=$1',[owner])).rejects.toThrow();
  await expect(db.query('SELECT * FROM public.invitations')).rejects.toThrow();
  await expect(db.query('SELECT public.perform_atomic_checkin($1,$2,$3,1,\'qr\',$4)',[eventId,groupId,owner,'ffffffff-ffff-4fff-8fff-ffffffffffff'])).rejects.toThrow();
  await db.exec('RESET ROLE');
 });
 it('activates paid plans only as administrator and imports atomically',async()=>{
  expect((await rpc('updateEventPlanByAdmin',{actorUserId:owner,eventId,planCode:'pro'})).ok).toBe(false);
  await db.query('UPDATE profiles SET is_platform_admin=true WHERE user_id=$1',[owner]);
  expect((await rpc('updateEventPlanByAdmin',{actorUserId:owner,eventId,planCode:'pro'})).ok).toBe(true);
  const rows=[{displayName:'Tamu Impor Satu',type:'individual',capacity:1,guestCategory:'regular',allowedPublicDisplay:false},{displayName:'Tamu Salah',type:'family',capacity:100,guestCategory:'regular',allowedPublicDisplay:false}];
  await expect(rpc('importInvitationGroups',{userId:owner,eventId,rows})).rejects.toThrow();
  expect((await rpc('getEventIfAuthorized',owner,eventId)).metrics.invitationGroupsCount).toBe(1);
  expect((await rpc('importInvitationGroups',{userId:owner,eventId,rows:[rows[0]]})).ok).toBe(true);
  expect((await rpc('importInvitationGroups',{userId:owner,eventId,rows:[rows[0]]})).ok).toBe(false);
 });
 it('exchanges one-time TV codes for restricted sessions and revokes them',async()=>{
  const code=await rpc('getEventTvPairingCode',eventId);
  expect(String(code)).toMatch(/^\d{6}$/);
  await actor('');
  const paired=await rpc('pairDisplay',{code});
  expect(paired.ok).toBe(true);
  expect((await rpc('pairDisplay',{code})).ok).toBe(false);
  const token=(paired as unknown as {token:string}).token;
  const state=await rpc('getDisplayScreenState',token);expect(state).not.toBeNull();
  expect((state as unknown as {latestPublicWelcome:null}).latestPublicWelcome).toBeNull();
  await actor(owner);expect((await rpc('revokeDisplaySessions',{userId:owner,eventId})).ok).toBe(true);
  await actor('');expect(await rpc('getDisplayScreenState',token)).toBeNull();await actor(owner);
 });
 it('enforces scanner quotas and keeps revoked devices disabled',async()=>{
  const event=await rpc('createEventInWorkspace',{userId:owner,workspaceId,title:'Kuota Scanner',brideName:'A',groomName:'B',eventDate:'2027-12-21',startTime:'18:00',endTime:'21:00',timezone:'Asia/Jakarta',venue:'Ballroom',city:'Jakarta',address:'',status:'published'});
  const created=await rpc('addInvitationGroupToEvent',{userId:owner,eventId:event.id,displayName:'Tamu Kuota',type:'family',capacity:4,guestCategory:'regular',allowedPublicDisplay:false});
  const input={userId:owner,eventId:event.id,groupIdOrQrToken:created.group.qrTokenPreview,deltaAttendees:1,method:'qr',idempotencyKey:crypto.randomUUID(),deviceKey:crypto.randomUUID()};
  expect((await rpc('recordEventCheckinOrCorrection',input)).ok).toBe(true);
  expect((await rpc('recordEventCheckinOrCorrection',{...input,idempotencyKey:crypto.randomUUID(),deviceKey:crypto.randomUUID()})).errorCode).toBe('QUOTA_EXCEEDED');
  const sessions=await rpc('listScannerSessions',{userId:owner,eventId:event.id});
  expect((await rpc('revokeScannerSession',{userId:owner,eventId:event.id,sessionId:sessions[0]!.id})).ok).toBe(true);
  expect((await rpc('recordEventCheckinOrCorrection',{...input,idempotencyKey:crypto.randomUUID()})).ok).toBe(false);
 });
 it('records signed corrections and rejects fractional or zero attendance',async()=>{
  const input={userId:owner,eventId,groupIdOrQrToken:groupId,deltaAttendees:-2,method:'correction',reasonNullable:'Koreksi jumlah hasil verifikasi',idempotencyKey:crypto.randomUUID()};
  expect((await rpc('recordEventCheckinOrCorrection',input)).group.checkedInCount).toBe(2);
  expect((await rpc('recordEventCheckinOrCorrection',{...input,deltaAttendees:1,idempotencyKey:crypto.randomUUID()})).group.checkedInCount).toBe(3);
  expect((await rpc('recordEventCheckinOrCorrection',{...input,deltaAttendees:0.5,idempotencyKey:crypto.randomUUID()})).ok).toBe(false);
  expect((await rpc('recordEventCheckinOrCorrection',{...input,deltaAttendees:0,idempotencyKey:crypto.randomUUID()})).ok).toBe(false);
 });
 it('shows welcome messages in FIFO order and acknowledges private VIP notifications',async()=>{
  await rpc('updateEventPlanByAdmin',{actorUserId:owner,eventId,planCode:'pro_plus'});
  const ids:string[]=[];
  for(const name of ['VIP Pertama','VIP Kedua']){
   const created=await rpc('addInvitationGroupToEvent',{userId:owner,eventId,displayName:name,type:'individual',capacity:1,guestCategory:'vip',allowedPublicDisplay:true});
   ids.push(created.group.id);
   expect((await rpc('recordEventCheckinOrCorrection',{userId:owner,eventId,groupIdOrQrToken:created.group.qrTokenPreview,deltaAttendees:1,method:'qr',idempotencyKey:crypto.randomUUID(),deviceKey:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'})).ok).toBe(true);
  }
  const code=await rpc('getEventTvPairingCode',eventId);await actor('');const paired=await rpc('pairDisplay',{code});const token=(paired as unknown as {token:string}).token;
  const first=await rpc('getDisplayScreenState',token) as unknown as {latestPublicWelcome:{displayName:string;notesPrivateOptional?:string}};
  expect(first.latestPublicWelcome.displayName).toBe('VIP Pertama');expect(first.latestPublicWelcome.notesPrivateOptional).toBeUndefined();
  await db.query("UPDATE display_events SET shown_at=NOW()-INTERVAL '9 seconds' WHERE event_id=$1 AND state='shown'",[eventId]);
  const second=await rpc('getDisplayScreenState',token) as unknown as {latestPublicWelcome:{displayName:string}};expect(second.latestPublicWelcome.displayName).toBe('VIP Kedua');
  await actor(owner);const notifications=await rpc('listVipNotifications',{userId:owner,eventId});
  expect((await rpc('ackVipNotification',{userId:owner,eventId,notificationId:notifications[0]!.id})).ok).toBe(true);
  const updated=await rpc('listVipNotifications',{userId:owner,eventId}) as unknown as Array<{status:string}>;expect(updated[0]!.status).toBe('acknowledged');
 });
 it('stops adding guests at the Free quota without deleting existing data',async()=>{
  const event=await rpc('createEventInWorkspace',{userId:owner,workspaceId,title:'Kuota Undangan',brideName:'A',groomName:'B',eventDate:'2027-12-22',startTime:'18:00',endTime:'21:00',timezone:'Asia/Jakarta',venue:'Ballroom',city:'Jakarta',address:'',status:'published'});
  for(let i=0;i<50;i++)expect((await rpc('addInvitationGroupToEvent',{userId:owner,eventId:event.id,displayName:`Tamu ${i}`,type:'individual',capacity:1,guestCategory:'regular',allowedPublicDisplay:false})).group).toBeDefined();
  const overflow=await rpc('addInvitationGroupToEvent',{userId:owner,eventId:event.id,displayName:'Tamu Berlebih',type:'individual',capacity:1,guestCategory:'regular',allowedPublicDisplay:false});
  expect((overflow as unknown as {code:string}).code).toBe('QUOTA_EXCEEDED');expect((await rpc('getEventIfAuthorized',owner,event.id)).metrics.invitationGroupsCount).toBe(50);
 });
});
