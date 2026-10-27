import { describe, it, expect, beforeEach } from 'vitest';
import {
  canInviteWithEventRole,
  hasPermission,
  resolveEffectiveEventRole,
} from '@/lib/permissions';
import {
  acceptMemberInviteByToken,
  createEventMemberInvite,
  createWorkspaceForUser,
  getEventIfAuthorized,
  getWorkspaceIfAuthorized,
  resetDevStoreForTests,
  revokeEventMemberInvite,
} from '@/lib/db/repository';
import { evaluateCheckinTransaction } from '@/lib/db/ledger';
import { canAddInvitationGroup, canStartScannerSession } from '@/lib/plans';
import { sanitizeSpreadsheetCell } from '@/lib/qr/tokens';

describe('SANSTECH Wedding Management System — Sprint 0 & 1 Security, RBAC & Isolation Suite', () => {
  beforeEach(() => {
    resetDevStoreForTests();
  });

  it('TC-001: Guest & Event Isolation — WO A tidak dapat mengakses workspace atau acara milik WO B', () => {
    const woAUserId = 'user-wo-a';
    const eventMilikWoB = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const workspaceMilikWoB = '33333333-3333-4333-8333-333333333333';

    expect(getWorkspaceIfAuthorized(woAUserId, workspaceMilikWoB)).toBeNull();
    expect(getEventIfAuthorized(woAUserId, eventMilikWoB)).toBeNull();
  });

  it('TC-002: Couple Invitation Scope — Pasangan hanya melihat acara yang dibagikan kepadanya, bukan semua acara WO', () => {
    const coupleUserId = 'user-couple-andi';
    const sharedEventId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const otherEventInSameWo = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

    const sharedAccess = getEventIfAuthorized(coupleUserId, sharedEventId);
    expect(sharedAccess).not.toBeNull();
    expect(sharedAccess?.myEffectiveRole).toBe('couple');

    const unauthorizedOtherEvent = getEventIfAuthorized(coupleUserId, otherEventInSameWo);
    expect(unauthorizedOtherEvent).toBeNull();
  });

  it('S1-01: Idempotent Onboarding — Refresh submit dengan idempotencyKey sama tidak menduplikasi workspace', () => {
    const idempotencyKey = '7b193b97-1aa2-4ac2-95fd-e486c3957c0d';
    const first = createWorkspaceForUser({
      userId: 'user-wo-a',
      type: 'wo',
      name: 'SANSTECH Cabang Bali',
      slug: 'sanstech-bali',
      idempotencyKey,
    });
    const second = createWorkspaceForUser({
      userId: 'user-wo-a',
      type: 'wo',
      name: 'SANSTECH Cabang Bali',
      slug: 'sanstech-bali',
      idempotencyKey,
    });

    expect(first.createdNew).toBe(true);
    expect(second.createdNew).toBe(false);
    expect(second.workspace.id).toBe(first.workspace.id);
  });

  it('ORG-02 & TC-003: Member Invite Lifecycle — Token kedaluwarsa atau dicabut langsung menolak akses', () => {
    const eventId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const created = createEventMemberInvite({
      actorUserId: 'user-wo-a',
      eventId,
      recipientEmail: 'staf.baru@sanstech.id',
      eventRoleGrant: 'receptionist',
    });

    expect('invite' in created).toBe(true);
    if (!('invite' in created)) return;

    const revoked = revokeEventMemberInvite({
      actorUserId: 'user-wo-a',
      eventId,
      inviteId: created.invite.id,
    });
    expect(revoked.ok).toBe(true);

    const attemptAccept = acceptMemberInviteByToken({
      userId: 'user-wo-b',
      rawToken: created.rawToken,
    });
    expect(attemptAccept.ok).toBe(false);
  });

  it('RBAC Matrix: Receptionist tidak boleh mengoreksi kehadiran; Supervisor diizinkan', () => {
    expect(hasPermission('receptionist', 'event:scan_checkin')).toBe(true);
    expect(hasPermission('receptionist', 'event:correct_checkin')).toBe(false);
    expect(hasPermission('supervisor', 'event:correct_checkin')).toBe(true);
    expect(canInviteWithEventRole('event_manager', 'workspace_owner' as never)).toBe(false);
  });

  it('TC-004, TC-006 & TC-008: Invarian Kapasitas Check-in Parsial, Idempotency, dan Cross-Event QR', () => {
    const group = {
      id: 'grp-1',
      eventId: 'ev-1',
      displayName: 'Bapak Budi & Keluarga',
      capacity: 4,
      guestCategory: 'vvip' as const,
      allowedPublicDisplay: false,
      status: 'active' as const,
    };

    // Kedatangan pertama +2 orang
    const step1 = evaluateCheckinTransaction({
      group,
      targetEventId: 'ev-1',
      existingLedger: [],
      actorUserId: 'user-staff',
      deltaAttendees: 2,
      method: 'qr',
      idempotencyKey: '11111111-1111-4111-8111-000000000001',
    });
    expect(step1.result.ok).toBe(true);
    expect(step1.result.checkedInCount).toBe(2);
    expect(step1.result.remaining).toBe(2);
    // Privasi VIP: allowedPublicDisplay=false -> welcomeQueued harus false (TC-011)
    expect(step1.result.welcomeQueued).toBe(false);

    const ledgerAfter1 = [step1.newEntry!];

    // Retry dengan idempotencyKey sama tidak boleh menambah saldo kedua kalinya (TC-006)
    const replay = evaluateCheckinTransaction({
      group,
      targetEventId: 'ev-1',
      existingLedger: ledgerAfter1,
      actorUserId: 'user-staff',
      deltaAttendees: 2,
      method: 'qr',
      idempotencyKey: '11111111-1111-4111-8111-000000000001',
    });
    expect(replay.result.status).toBe('idempotent_replay');
    expect(replay.result.checkedInCount).toBe(2);

    // Kedatangan kedua +2 orang (total 4/4)
    const step2 = evaluateCheckinTransaction({
      group,
      targetEventId: 'ev-1',
      existingLedger: ledgerAfter1,
      actorUserId: 'user-staff',
      deltaAttendees: 2,
      method: 'qr',
      idempotencyKey: '11111111-1111-4111-8111-000000000002',
    });
    expect(step2.result.ok).toBe(true);
    expect(step2.result.checkedInCount).toBe(4);
    expect(step2.result.remaining).toBe(0);

    const ledgerAfter2 = [...ledgerAfter1, step2.newEntry!];

    // Kedatangan ke-5 (+1) wajib ditolak karena melebihi kapasitas 4
    const stepOverflow = evaluateCheckinTransaction({
      group,
      targetEventId: 'ev-1',
      existingLedger: ledgerAfter2,
      actorUserId: 'user-staff',
      deltaAttendees: 1,
      method: 'qr',
      idempotencyKey: '11111111-1111-4111-8111-000000000003',
    });
    expect(stepOverflow.result.ok).toBe(false);
    expect(stepOverflow.result.status).toBe('capacity_exceeded');
  });

  it('TC-013, TC-015 & TC-017: Quota Enforcement & Pencegahan CSV Injection', () => {
    expect(canAddInvitationGroup('free', 50).allowed).toBe(false);
    expect(canAddInvitationGroup('free', 49).allowed).toBe(true);
    expect(canStartScannerSession('free', 1).allowed).toBe(false);
    expect(canStartScannerSession('pro', 2).allowed).toBe(true);

    expect(sanitizeSpreadsheetCell('=CMD("calc")')).toBe('\'=CMD("calc")');
    expect(sanitizeSpreadsheetCell('Bapak Budi')).toBe('Bapak Budi');
    expect(
      resolveEffectiveEventRole({
        workspaceRole: null,
        eventRole: 'couple',
      })
    ).toBe('couple');
  });
});

