import {beforeAll, afterAll, describe, expect, it, vi} from 'vitest';
import {randomBytes, randomUUID} from 'node:crypto';
import {DriveDatabase} from '@/lib/drive/database';
import {type Snapshot, type SnapshotStore, checksum} from '@/lib/drive/transport';
import {SNAPSHOT_FORMAT} from '@/lib/drive/config';
import type {WorkspaceSummary, EventSummary, InvitationGroupDetail} from '@/lib/types';

class MemoryDrive implements SnapshotStore {
  snapshot: Snapshot = {version: 0, data: null, checksum: null, format: SNAPSHOT_FORMAT};
  conflicts = 0;
  loseNextAcknowledgement = false;
  async read() {return structuredClone(this.snapshot);}
  async commit(baseVersion: number, data: string) {
    if (this.snapshot.version !== baseVersion) {this.conflicts++; return false;}
    this.snapshot = {version: baseVersion + 1, data, checksum: checksum(data), format: SNAPSHOT_FORMAT};
    if (this.loseNextAcknowledgement) {this.loseNextAcknowledgement = false; throw new Error('Simulated network loss after commit');}
    return true;
  }
}
const store = new MemoryDrive();
const first = new DriveDatabase(store), second = new DriveDatabase(store);
const ownerToken = randomBytes(32).toString('base64url'), otherToken = randomBytes(32).toString('base64url');
let uid: string, otherUid: string, eventId: string, guest: InvitationGroupDetail;

describe('Drive-backed production repository with separate database instances', () => {
  it('creates real profiles without demo accounts and restores sessions from the snapshot', async () => {
    const user = await first.signIn({sub: 'google-owner', email: 'owner@example.com', name: 'Pemilik Acara'}, ownerToken);
    uid = user.userId;
    expect(user.isPlatformAdmin).toBe(false);
    expect(await second.profile(ownerToken)).toEqual(user);
    expect(await first.profile('user-platform-admin')).toBeNull();
    const other = await second.signIn({sub: 'google-other', email: 'other@example.com', name: 'Pengguna Lain'}, otherToken);
    otherUid = other.userId;
    expect(store.snapshot.data).not.toBeNull();
  }, 120_000);

  it('persists onboarding and enforces actor identity and tenant isolation', async () => {
    const input = {userId: uid, type: 'wo', name: 'Acara Google Drive', slug: 'google-drive', idempotencyKey: randomUUID()};
    const created = await first.rpc<{workspace: WorkspaceSummary}>('createWorkspaceForUser', [input], ownerToken);
    const again = await second.rpc<{workspace: WorkspaceSummary; createdNew: boolean}>('createWorkspaceForUser', [input], ownerToken);
    expect(again.workspace.id).toBe(created.workspace.id); expect(again.createdNew).toBe(false);
    const event = await first.rpc<EventSummary>('createEventInWorkspace', [{userId: uid, workspaceId: created.workspace.id,
      title: 'Pernikahan Drive', brideName: 'Putri', groomName: 'Andi', eventDate: '2099-12-20', startTime: '18:00', endTime: '21:00',
      timezone: 'Asia/Jakarta', venue: 'Ballroom', city: 'Jakarta', address: '', status: 'published', planCode: 'pro_plus'}], ownerToken);
    eventId = event.id; expect(event.planCode).toBe('free');
    expect(await second.rpc('getEventIfAuthorized', [otherUid, eventId], otherToken)).toBeNull();
    await expect(second.rpc('getEventIfAuthorized', [uid, eventId], otherToken)).rejects.toThrow();
    await expect(second.rpc('getEventIfAuthorized', [uid, eventId], 'forged')).rejects.toThrow();
    guest = (await first.rpc<{group: InvitationGroupDetail}>('addInvitationGroupToEvent', [{userId: uid, eventId,
      displayName: 'Keluarga Drive', type: 'family', capacity: 4, guestCategory: 'regular', allowedPublicDisplay: false,
      notesPrivateOptional: 'RAHASIA', phoneOptional: '08123456789'}], ownerToken)).group;
  }, 120_000);

  it('retries compare-and-swap conflicts without exceeding capacity or duplicating retries', async () => {
    const deviceKey = randomUUID();
    const requests = Array.from({length: 6}, (_, index) => (index % 2 ? first : second).rpc<{ok: boolean}>(
      'recordEventCheckinOrCorrection', [{userId: uid, eventId, groupIdOrQrToken: guest.qrTokenPreview, deltaAttendees: 1,
        method: 'qr', deviceKey, idempotencyKey: randomUUID()}], ownerToken));
    const results = await Promise.all(requests);
    expect(results.filter(result => result.ok)).toHaveLength(4);
    expect(store.conflicts).toBeGreaterThan(0);
    const groups = await second.rpc<InvitationGroupDetail[]>('listInvitationGroupsForEvent', [uid, eventId], ownerToken);
    expect(groups[0]!.checkedInCount).toBe(4);
  }, 180_000);

  it('keeps public invitations private and RSVP distinct from check-in', async () => {
    const data = await second.rpc<{group: InvitationGroupDetail}>('getPublicInvitationByToken', [guest.publicTokenPreview]);
    expect(data.group.notesPrivateOptional).toBeUndefined(); expect(data.group.phoneOptional).toBeUndefined();
    const before = store.snapshot.version;
    await first.rpc('getPublicInvitationByToken', [guest.publicTokenPreview]);
    expect(store.snapshot.version).toBe(before);
    const rsvp = await second.rpc<{ok: boolean}>('submitPublicRsvpByToken', [{rawToken: guest.publicTokenPreview, rsvpStatus: 'attending', attendeeCount: 2}]);
    expect(rsvp.ok).toBe(true);
    const groups = await first.rpc<InvitationGroupDetail[]>('listInvitationGroupsForEvent', [uid, eventId], ownerToken);
    expect(groups[0]!.rsvpCount).toBe(2); expect(groups[0]!.checkedInCount).toBe(4);
  }, 120_000);

  it('revokes persistent sessions and rejects a stolen cookie after logout', async () => {
    await first.revoke(ownerToken);
    expect(await second.profile(ownerToken)).toBeNull();
    await expect(second.rpc('getEventIfAuthorized', [uid, eventId], ownerToken)).rejects.toThrow();
    expect(await second.profile(otherToken)).not.toBeNull();
  }, 120_000);

  it('does not duplicate a committed check-in when its acknowledgement is lost', async () => {
    const workspace = await second.rpc<WorkspaceSummary[]>('getAuthorizedWorkspacesForUser', [otherUid], otherToken);
    expect(workspace).toHaveLength(0);
    const created = await second.rpc<{workspace: WorkspaceSummary}>('createWorkspaceForUser', [{userId: otherUid, type: 'wo', name: 'Pengulangan Drive', slug: 'pengulangan-drive', idempotencyKey: randomUUID()}], otherToken);
    const event = await second.rpc<EventSummary>('createEventInWorkspace', [{userId: otherUid, workspaceId: created.workspace.id,
      title: 'Uji Pengulangan', brideName: 'Putri', groomName: 'Andi', eventDate: '2099-12-20', startTime: '18:00', endTime: '21:00',
      timezone: 'Asia/Jakarta', venue: 'Ballroom', city: 'Jakarta', address: '', status: 'published'}], otherToken);
    const {group} = await second.rpc<{group: InvitationGroupDetail}>('addInvitationGroupToEvent', [{userId: otherUid, eventId: event.id,
      displayName: 'Tamu Pengulangan', type: 'couple', capacity: 2, guestCategory: 'regular', allowedPublicDisplay: false}], otherToken);
    const args = [{userId: otherUid, eventId: event.id, groupIdOrQrToken: group.qrTokenPreview, deltaAttendees: 1,
      method: 'qr', deviceKey: randomUUID(), idempotencyKey: randomUUID()}];
    store.loseNextAcknowledgement = true;
    await expect(first.rpc('recordEventCheckinOrCorrection', args, otherToken)).rejects.toThrow('Simulated network loss');
    expect((await second.rpc<{ok: boolean}>('recordEventCheckinOrCorrection', args, otherToken)).ok).toBe(true);
    const ledger = await second.rpc<unknown[]>('listCheckinLedgerForEvent', [otherUid, event.id], otherToken);
    expect(ledger).toHaveLength(1);
    expect((await first.rpc<InvitationGroupDetail[]>('listInvitationGroupsForEvent', [otherUid, event.id], otherToken))[0]!.checkedInCount).toBe(1);
  }, 120_000);

  it('continues rejecting rollback after the local engine cache is discarded', async () => {
    const current = structuredClone(store.snapshot);
    store.snapshot = {...current, version: current.version - 1};
    try {
      await expect(second.profile(otherToken)).rejects.toThrow('Versi penyimpanan mundur');
      await expect(second.profile(otherToken)).rejects.toThrow('Versi penyimpanan mundur');
    } finally {store.snapshot = current;}
    expect(await second.profile(otherToken)).not.toBeNull();
  }, 120_000);
});

beforeAll(() => {vi.stubEnv('DRIVE_ENCRYPTION_KEY','ab'.repeat(32));});
afterAll(async () => {await first.close(); await second.close(); store.snapshot.data = null; vi.unstubAllEnvs();});
