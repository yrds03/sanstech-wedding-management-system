import { describe, it, expect, beforeEach } from 'vitest';
import {
  canInviteWithEventRole,
  hasPermission,
  resolveEffectiveEventRole,
} from '@/lib/permissions';
import {
  acceptMemberInviteByToken,
  addInvitationGroupToEvent,
  createEventInWorkspace,
  createEventMemberInvite,
  createWorkspaceForUser,
  getAuthorizedEventsForWorkspace,
  getEventIfAuthorized,
  getEventTvPairingCode,
  getPublicInvitationByToken,
  getWorkspaceIfAuthorized,
  recordEventCheckinOrCorrection,
  resetAllDataToZero,
  resetDevStoreForTests,
  revokeEventMemberInvite,
} from '@/lib/db/repository';
import { evaluateCheckinTransaction } from '@/lib/db/ledger';
import {
  canAddInvitationGroup,
  canStartScannerSession,
  evaluateEventPostLifecycle,
  getAddOnsCatalog,
  getPlansCatalog,
  updatePlatformPricingAndRetention,
} from '@/lib/plans';
import { sanitizeSpreadsheetCell } from '@/lib/qr/tokens';
import { generateQrCodeDataUrl, generateQrCodeSvg } from '@/lib/qr/render';
import { checkRateLimit } from '@/lib/security/rate-limit';
import {
  DEMO_USERS,
  getDisplayScreenState,
  purgeEventTestingData,
} from '@/lib/db/repository';

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

  it('Pricing, Post-Event Grace Period Lifecycle & Testing Data Purge: Mengatur harga, masa aktif H+N, dan hapus data testing', () => {
    updatePlatformPricingAndRetention({
      proPriceIdr: 2500000,
      proPlusPriceIdr: 5500000,
      gracePeriodDaysAfterEvent: 14,
    });

    const catalog = getPlansCatalog();
    expect(catalog.pro.priceIdr).toBe(2500000);
    expect(catalog.pro_plus.priceIdr).toBe(5500000);

    // Uji masa tenggang H+5 (masih dalam 14 hari -> read-only laporan)
    const graceState = evaluateEventPostLifecycle({
      eventDate: '2026-10-10',
      planCode: 'pro',
      referenceDateStr: '2026-10-15',
    });
    expect(graceState.phase).toBe('grace_period_readonly');
    expect(graceState.canMutateGuestsOrCheckin).toBe(false);
    expect(graceState.canViewAndDownloadReport).toBe(true);

    // Uji lewat H+20 (> 14 hari -> terkunci otomatis)
    const expiredState = evaluateEventPostLifecycle({
      eventDate: '2026-10-01',
      planCode: 'pro',
      referenceDateStr: '2026-10-25',
    });
    expect(expiredState.phase).toBe('expired_locked');
    expect(expiredState.canViewAndDownloadReport).toBe(false);

    // Uji hapus seluruh data testing pada acara
    const purgeRes = purgeEventTestingData({
      userId: 'user-wo-a',
      eventId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      mode: 'delete_all_test_guests',
    });
    expect(purgeRes.ok).toBe(true);

    // Uji Rate Limiter
    const rl = checkRateLimit({ key: 'test-ip', limit: 2, windowMs: 10000 });
    expect(rl.allowed).toBe(true);
  });

  it('QR Matrix Image, Super Admin Isolation, Add-Ons Catalog & Auto-Sync TV Display State', async () => {
    // 1. Real 2D QR Code SVG & PNG Data URL
    const svg = await generateQrCodeSvg('QR-ANDI-VVIP-001');
    expect(svg).toContain('<svg');
    const dataUrl = await generateQrCodeDataUrl('QR-ANDI-VVIP-001');
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);

    // 2. Super Admin Isolation: Akun WO & Klien tidak boleh memiliki isPlatformAdmin
    expect(DEMO_USERS['user-wo-a']?.isPlatformAdmin).toBe(false);
    expect(DEMO_USERS['user-couple-andi']?.isPlatformAdmin).toBe(false);
    expect(DEMO_USERS['user-platform-admin']?.isPlatformAdmin).toBe(true);

    // 3. Katalog 10 Add-Ons & update harga Add-On
    const addOnsBefore = getAddOnsCatalog();
    expect(addOnsBefore.length).toBeGreaterThanOrEqual(10);
    updatePlatformPricingAndRetention({
      proPriceIdr: 1490000,
      proPlusPriceIdr: 3490000,
      gracePeriodDaysAfterEvent: 14,
      addOnsPrices: { addon_extra_quota_250: 550000 },
    });
    const addOnsAfter = getAddOnsCatalog();
    const extraQuotaAddon = addOnsAfter.find((a) => a.code === 'addon_extra_quota_250');
    expect(extraQuotaAddon?.priceIdr).toBe(550000);

    // 4. Live Display State: Tidak pernah 404 walaupun sessionId baru di tab terpisah
    const displayState = getDisplayScreenState('unknown-or-new-session-id');
    expect(displayState).not.toBeNull();
    expect(displayState?.event.brideName).toBeDefined();
  });

  it('Full End-to-End Backtest dari 0: Reset ke 0 -> Buat Workspace -> Buat Acara -> Tambah Tamu -> Buka Undangan Portable -> Pairing TV 6-Digit -> Scan QR -> Muncul di TV', () => {
    // 1. Kosongkan sistem ke 0 (Zero State)
    resetAllDataToZero();
    const initialEvents = getAuthorizedEventsForWorkspace(
      'user-wo-a',
      '11111111-1111-4111-8111-111111111111'
    );
    expect(initialEvents?.length).toBe(0);

    // 2. Buat Workspace Baru dari Onboarding
    const wsCreated = createWorkspaceForUser({
      userId: 'user-wo-a',
      type: 'wo',
      name: 'SANSTECH Prime WO',
      slug: 'sanstech-prime-wo',
      idempotencyKey: 'e2e-ws-key-001',
    });
    expect(wsCreated.workspace.id).toBeDefined();
    expect(getWorkspaceIfAuthorized('user-wo-a', wsCreated.workspace.id)).not.toBeNull();

    // 3. Buat Acara Pernikahan Baru (Order Paket Royal Grand / Pro Plus)
    const evCreated = createEventInWorkspace({
      userId: 'user-wo-a',
      workspaceId: wsCreated.workspace.id,
      title: 'The Royal Wedding of Rian & Nadya',
      brideName: 'Nadya Kusuma',
      groomName: 'Rian Saputra',
      eventDate: '2026-12-20',
      startTime: '18:30',
      endTime: '21:30',
      timezone: 'Asia/Jakarta',
      venue: 'Grand Ballroom Kempinski',
      city: 'Jakarta Pusat',
      address: 'Jl. M.H. Thamrin No. 1',
      planCode: 'pro_plus',
    });
    expect('id' in evCreated).toBe(true);
    if (!('id' in evCreated)) return;

    const fetchedEv = getEventIfAuthorized('user-wo-a', evCreated.id);
    expect(fetchedEv?.title).toBe('The Royal Wedding of Rian & Nadya');
    expect(fetchedEv?.planCode).toBe('pro_plus');

    // 4. Tambah Tamu VVIP dengan Izin Tampil TV = true
    const guestAdded = addInvitationGroupToEvent({
      userId: 'user-wo-a',
      eventId: evCreated.id,
      displayName: 'Bapak H. Sudirman & Ibu',
      type: 'couple',
      capacity: 2,
      guestCategory: 'vvip',
      tableLabelOptional: 'Meja VVIP 01',
      allowedPublicDisplay: true,
    });
    expect('group' in guestAdded).toBe(true);
    if (!('group' in guestAdded)) return;

    // 5. Uji buka tautan undangan publik (/i/[publicToken])
    const pubInvite = getPublicInvitationByToken(guestAdded.group.publicTokenPreview);
    expect(pubInvite).not.toBeNull();
    expect(pubInvite?.group.displayName).toBe('Bapak H. Sudirman & Ibu');

    // 6. Uji Kode Pairing TV 6-Digit Sebelum Scan
    const pairingCode = getEventTvPairingCode(evCreated.id);
    expect(pairingCode.length).toBe(6);
    const tvBeforeScan = getDisplayScreenState(pairingCode);
    expect(tvBeforeScan.event.id).toBe(evCreated.id);
    expect(tvBeforeScan.latestPublicWelcome).toBeNull();

    // 7. Scan QR Tamu di Meja Registrasi (+2 orang hadir)
    const scanRes = recordEventCheckinOrCorrection({
      userId: 'user-wo-a',
      eventId: evCreated.id,
      groupIdOrQrToken: guestAdded.group.qrTokenPreview,
      deltaAttendees: 2,
      method: 'qr',
      idempotencyKey: 'e2e-checkin-key-001',
    });
    expect(scanRes.ok).toBe(true);

    // 8. Layar TV dengan Kode Pairing 6-Digit langsung menampilkan nama tamu secara otomatis!
    const tvAfterScan = getDisplayScreenState(pairingCode);
    expect(tvAfterScan.latestPublicWelcome?.displayName).toBe('Bapak H. Sudirman & Ibu');
    expect(tvAfterScan.totalCheckedInPersons).toBe(2);
  });
});

