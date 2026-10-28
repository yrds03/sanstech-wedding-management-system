import {
  AuditLogItem,
  CheckinLogViewItem,
  CheckinMethod,
  EffectiveRole,
  EventRole,
  EventStatus,
  EventSummary,
  GuestCategory,
  InvitationGroupDetail,
  InvitationGroupType,
  MemberInviteItem,
  PlanCode,
  RsvpStatus,
  UserProfile,
  WorkspaceRole,
  WorkspaceSummary,
  WorkspaceType,
} from '@/lib/types';
import { hasPermission, resolveEffectiveEventRole } from '@/lib/permissions';
import { canAddInvitationGroup } from '@/lib/plans';
import { generateOpaqueToken, hashOpaqueToken } from '@/lib/qr/tokens';

interface InternalWorkspaceRecord {
  id: string;
  type: WorkspaceType;
  name: string;
  slug: string;
  ownerUserId: string;
  createdAt: string;
  idempotencyKey?: string;
}

interface InternalWorkspaceMembership {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  status: 'active' | 'revoked';
}

interface InternalEventMembership {
  eventId: string;
  userId: string;
  role: EventRole;
  status: 'active' | 'revoked';
}

interface InternalInviteRecord {
  id: string;
  workspaceId: string;
  eventId: string | null;
  recipientEmail: string;
  workspaceRoleGrant: WorkspaceRole | null;
  eventRoleGrant: EventRole | null;
  tokenHash: string;
  rawTokenForDevPreview?: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdByUserId: string;
  createdByEmail: string;
  createdAt: string;
}

interface StoreState {
  users: Record<string, UserProfile>;
  workspaces: InternalWorkspaceRecord[];
  workspaceMemberships: InternalWorkspaceMembership[];
  events: EventSummary[];
  eventMemberships: InternalEventMembership[];
  invitationGroups: InvitationGroupDetail[];
  checkinLedger: CheckinLogViewItem[];
  invites: InternalInviteRecord[];
  auditLogs: AuditLogItem[];
}

export const DEMO_USERS: Record<string, UserProfile> = {
  'user-wo-a': {
    userId: 'user-wo-a',
    email: 'owner@sanstech-wo.id',
    displayName: 'Raka Pratama (Owner SANSTECH WO)',
    phoneOptional: '081234567890',
    isPlatformAdmin: false, // Dipisahkan agar klien/WO biasa tidak melihat tombol Pengaturan Harga Super Admin
  },
  'user-couple-andi': {
    userId: 'user-couple-andi',
    email: 'andi.putri@contoh.id',
    displayName: 'Andi & Putri (Pasangan Pengantin)',
    phoneOptional: '081298765432',
    isPlatformAdmin: false,
  },
  'user-wo-b': {
    userId: 'user-wo-b',
    email: 'admin@lusiana-organizer.id',
    displayName: 'Lusiana (Owner WO Tenant B)',
    phoneOptional: '081311223344',
    isPlatformAdmin: false,
  },
  'user-platform-admin': {
    userId: 'user-platform-admin',
    email: 'superadmin@sanstech.id',
    displayName: 'Super Admin SANSTECH (Pemilik Sistem)',
    isPlatformAdmin: true,
  },
};

function createInitialGuestSamples(): InvitationGroupDetail[] {
  const eventA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  return [
    {
      id: 'grp-vvip-budi',
      eventId: eventA,
      displayName: 'Bapak Budi Santoso & Ibu [DATA TESTING]',
      phoneOptional: '081199887766',
      type: 'couple',
      capacity: 2,
      guestCategory: 'vvip',
      tableLabelOptional: 'Meja VVIP 01',
      notesPrivateOptional: 'Komisaris Utama — Jemput di Lobby Utama',
      allowedPublicDisplay: true,
      rsvpStatus: 'attending',
      rsvpCount: 2,
      rsvpNote: 'Selamat berbahagia untuk Andi & Putri!',
      checkedInCount: 0,
      remainingCapacity: 2,
      qrTokenPreview: 'QR-ANDI-VVIP-001',
      publicTokenPreview: 'inv-andi-putri-budi-santoso',
      tokenVersion: 1,
      isTestData: true,
      createdAt: '2026-10-25T10:00:00.000Z',
    },
    {
      id: 'grp-vip-hendra',
      eventId: eventA,
      displayName: 'Keluarga Besar Dr. Hendra Wijaya [DATA TESTING]',
      phoneOptional: '081233445566',
      type: 'family',
      capacity: 4,
      guestCategory: 'vip',
      tableLabelOptional: 'Meja VIP 03',
      notesPrivateOptional: 'Tamu penting tidak ingin nama tampil di layar TV',
      allowedPublicDisplay: false,
      rsvpStatus: 'attending',
      rsvpCount: 4,
      rsvpNote: 'Kami hadir berempat bersama keluarga.',
      checkedInCount: 2,
      remainingCapacity: 2,
      qrTokenPreview: 'QR-ANDI-VIP-002',
      publicTokenPreview: 'inv-andi-putri-hendra-wijaya',
      tokenVersion: 1,
      isTestData: true,
      createdAt: '2026-10-25T11:00:00.000Z',
    },
    {
      id: 'grp-reg-siti',
      eventId: eventA,
      displayName: 'Siti Rahmawati [DATA TESTING]',
      phoneOptional: '081377889900',
      type: 'individual',
      capacity: 1,
      guestCategory: 'regular',
      tableLabelOptional: 'Meja Melati 08',
      notesPrivateOptional: 'Sahabat kuliah mempelai wanita',
      allowedPublicDisplay: true,
      rsvpStatus: 'attending',
      rsvpCount: 1,
      checkedInCount: 0,
      remainingCapacity: 1,
      qrTokenPreview: 'QR-ANDI-REG-003',
      publicTokenPreview: 'inv-andi-putri-siti-rahma',
      tokenVersion: 1,
      isTestData: true,
      createdAt: '2026-10-25T12:00:00.000Z',
    },
  ];
}

function createInitialCheckinSamples(): CheckinLogViewItem[] {
  return [
    {
      id: 'chk-sample-1',
      eventId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      invitationGroupId: 'grp-vip-hendra',
      guestDisplayName: 'Keluarga Besar Dr. Hendra Wijaya [DATA TESTING]',
      guestCategory: 'vip',
      tableLabelOptional: 'Meja VIP 03',
      actorName: 'Petugas Gate A (Simulasi)',
      deltaAttendees: 2,
      method: 'qr',
      reasonNullable: null,
      idempotencyKey: '99999999-9999-4999-8999-999999999999',
      createdAt: '2026-10-27T11:30:00.000Z',
    },
  ];
}

function createInitialDevState(): StoreState {
  const initialGroups = createInitialGuestSamples();
  const initialLedger = createInitialCheckinSamples();

  const state: StoreState = {
    users: { ...DEMO_USERS },
    workspaces: [
      {
        id: '11111111-1111-4111-8111-111111111111',
        type: 'wo',
        name: 'SANSTECH Signature Organizer',
        slug: 'sanstech-signature-wo',
        ownerUserId: 'user-wo-a',
        createdAt: '2026-10-20T08:00:00.000Z',
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        type: 'personal',
        name: 'Pernikahan Andi & Putri',
        slug: 'pernikahan-andi-putri',
        ownerUserId: 'user-couple-andi',
        createdAt: '2026-10-21T09:00:00.000Z',
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        type: 'wo',
        name: 'Lusiana Wedding Planner (Tenant B)',
        slug: 'lusiana-wedding-planner',
        ownerUserId: 'user-wo-b',
        createdAt: '2026-10-22T10:00:00.000Z',
      },
    ],
    workspaceMemberships: [
      {
        workspaceId: '11111111-1111-4111-8111-111111111111',
        userId: 'user-wo-a',
        role: 'owner',
        status: 'active',
      },
      {
        workspaceId: '22222222-2222-4222-8222-222222222222',
        userId: 'user-couple-andi',
        role: 'owner',
        status: 'active',
      },
      {
        workspaceId: '33333333-3333-4333-8333-333333333333',
        userId: 'user-wo-b',
        role: 'owner',
        status: 'active',
      },
    ],
    events: [
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        workspaceId: '11111111-1111-4111-8111-111111111111',
        workspaceName: 'SANSTECH Signature Organizer',
        workspaceType: 'wo',
        title: 'Royal Reception Andi & Putri',
        brideName: 'Putri Maharani',
        groomName: 'Andi Wijaya',
        eventDate: '2026-11-20',
        startTime: '18:30',
        endTime: '21:30',
        timezone: 'Asia/Jakarta',
        venue: 'Grand Ballroom Hotel Mulia Senayan',
        address: 'Jl. Asia Afrika, Senayan',
        city: 'Jakarta Pusat',
        status: 'published',
        planCode: 'pro_plus',
        licenseStatus: 'active',
        myEffectiveRole: 'workspace_owner',
        metrics: {
          invitationGroupsCount: 3,
          invitedCapacityTotal: 7,
          rsvpAttendingCount: 7,
          checkedInPersonsCount: 2,
          checkedInGroupsCount: 1,
          vipCheckedInCount: 1,
          vipTotalCount: 2,
        },
      },
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        workspaceId: '11111111-1111-4111-8111-111111111111',
        workspaceName: 'SANSTECH Signature Organizer',
        workspaceType: 'wo',
        title: 'Intimate Garden Wedding Dimas & Intan',
        brideName: 'Intan Permata',
        groomName: 'Dimas Prakoso',
        eventDate: '2026-12-05',
        startTime: '10:00',
        endTime: '13:00',
        timezone: 'Asia/Jakarta',
        venue: 'Plataran Menteng',
        address: 'Jl. HOS. Cokroaminoto No. 42',
        city: 'Jakarta Pusat',
        status: 'draft',
        planCode: 'free',
        licenseStatus: 'active',
        myEffectiveRole: 'workspace_owner',
        metrics: {
          invitationGroupsCount: 0,
          invitedCapacityTotal: 0,
          rsvpAttendingCount: 0,
          checkedInPersonsCount: 0,
          checkedInGroupsCount: 0,
          vipCheckedInCount: 0,
          vipTotalCount: 0,
        },
      },
      {
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        workspaceId: '33333333-3333-4333-8333-333333333333',
        workspaceName: 'Lusiana Wedding Planner (Tenant B)',
        workspaceType: 'wo',
        title: 'Royal Wedding Kevin & Clarissa (Tenant B)',
        brideName: 'Clarissa',
        groomName: 'Kevin',
        eventDate: '2026-12-12',
        startTime: '19:00',
        endTime: '22:00',
        timezone: 'Asia/Jakarta',
        venue: 'The Ritz-Carlton Pacific Place',
        address: 'SCBD Jakarta',
        city: 'Jakarta Selatan',
        status: 'published',
        planCode: 'pro',
        licenseStatus: 'active',
        myEffectiveRole: 'workspace_owner',
        metrics: {
          invitationGroupsCount: 0,
          invitedCapacityTotal: 0,
          rsvpAttendingCount: 0,
          checkedInPersonsCount: 0,
          checkedInGroupsCount: 0,
          vipCheckedInCount: 0,
          vipTotalCount: 0,
        },
      },
    ],
    eventMemberships: [
      {
        eventId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        userId: 'user-couple-andi',
        role: 'couple',
        status: 'active',
      },
    ],
    invitationGroups: initialGroups,
    checkinLedger: initialLedger,
    invites: [
      {
        id: 'inv-sample-1',
        workspaceId: '11111111-1111-4111-8111-111111111111',
        eventId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        recipientEmail: 'supervisor.shift1@sanstech-wo.id',
        workspaceRoleGrant: null,
        eventRoleGrant: 'supervisor',
        tokenHash: hashOpaqueToken('sample-dev-invite-token-supervisor'),
        rawTokenForDevPreview: 'sample-dev-invite-token-supervisor',
        expiresAt: '2026-11-15T23:59:59.000Z',
        acceptedAt: null,
        revokedAt: null,
        createdByUserId: 'user-wo-a',
        createdByEmail: 'owner@sanstech-wo.id',
        createdAt: '2026-10-26T10:00:00.000Z',
      },
    ],
    auditLogs: [
      {
        id: 'aud-1',
        workspaceId: '11111111-1111-4111-8111-111111111111',
        eventId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        actorName: 'Raka Pratama (Owner SANSTECH WO)',
        action: 'event.created',
        entityType: 'event',
        entityId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        summary:
          'Membuat acara Royal Reception Andi & Putri dan mengundang pasangan sebagai kolaborator.',
        createdAt: '2026-10-25T14:20:00.000Z',
      },
    ],
  };

  return state;
}

function createCleanZeroState(): StoreState {
  return {
    users: { ...DEMO_USERS },
    workspaces: [
      {
        id: '11111111-1111-4111-8111-111111111111',
        type: 'wo',
        name: 'SANSTECH Signature Organizer',
        slug: 'sanstech-signature-wo',
        ownerUserId: 'user-wo-a',
        createdAt: '2026-10-20T08:00:00.000Z',
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        type: 'personal',
        name: 'Workspace Pasangan Pengantin',
        slug: 'workspace-pengantin',
        ownerUserId: 'user-couple-andi',
        createdAt: '2026-10-21T09:00:00.000Z',
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        type: 'wo',
        name: 'Lusiana Wedding Planner (Tenant B)',
        slug: 'lusiana-wedding-planner',
        ownerUserId: 'user-wo-b',
        createdAt: '2026-10-22T10:00:00.000Z',
      },
    ],
    workspaceMemberships: [
      {
        workspaceId: '11111111-1111-4111-8111-111111111111',
        userId: 'user-wo-a',
        role: 'owner',
        status: 'active',
      },
      {
        workspaceId: '22222222-2222-4222-8222-222222222222',
        userId: 'user-couple-andi',
        role: 'owner',
        status: 'active',
      },
      {
        workspaceId: '33333333-3333-4333-8333-333333333333',
        userId: 'user-wo-b',
        role: 'owner',
        status: 'active',
      },
    ],
    events: [],
    eventMemberships: [],
    invitationGroups: [],
    checkinLedger: [],
    invites: [],
    auditLogs: [],
  };
}

const globalForStore = globalThis as unknown as { __sanstechStore?: StoreState };

function getStore(): StoreState {
  if (!globalForStore.__sanstechStore) {
    globalForStore.__sanstechStore = createCleanZeroState();
  }
  return globalForStore.__sanstechStore;
}

export function resetAllDataToZero(): void {
  globalForStore.__sanstechStore = createCleanZeroState();
}

function recalculateEventMetrics(eventId: string): void {
  const store = getStore();
  const ev = store.events.find((e) => e.id === eventId);
  if (!ev) return;

  const groups = store.invitationGroups.filter((g) => g.eventId === eventId);
  const ledger = store.checkinLedger.filter((l) => l.eventId === eventId);

  for (const g of groups) {
    const sum = ledger
      .filter((l) => l.invitationGroupId === g.id)
      .reduce((acc, item) => acc + item.deltaAttendees, 0);
    g.checkedInCount = Math.max(0, sum);
    g.remainingCapacity = Math.max(0, g.capacity - g.checkedInCount);
  }

  ev.metrics = {
    invitationGroupsCount: groups.length,
    invitedCapacityTotal: groups.reduce((acc, g) => acc + g.capacity, 0),
    rsvpAttendingCount: groups
      .filter((g) => g.rsvpStatus === 'attending')
      .reduce((acc, g) => acc + g.rsvpCount, 0),
    checkedInPersonsCount: groups.reduce((acc, g) => acc + g.checkedInCount, 0),
    checkedInGroupsCount: groups.filter((g) => g.checkedInCount > 0).length,
    vipCheckedInCount: groups.filter(
      (g) => (g.guestCategory === 'vip' || g.guestCategory === 'vvip') && g.checkedInCount > 0
    ).length,
    vipTotalCount: groups.filter(
      (g) => g.guestCategory === 'vip' || g.guestCategory === 'vvip'
    ).length,
  };
}

export function resetDevStoreForTests(): void {
  globalForStore.__sanstechStore = createInitialDevState();
}

export function getUserProfileById(userId: string): UserProfile | null {
  const store = getStore();
  return store.users[userId] ?? null;
}

export function getAuthorizedWorkspacesForUser(userId: string): WorkspaceSummary[] {
  const store = getStore();
  const activeMemberships = store.workspaceMemberships.filter(
    (m) => m.userId === userId && m.status === 'active'
  );

  return activeMemberships
    .map((membership) => {
      const ws = store.workspaces.find((w) => w.id === membership.workspaceId);
      if (!ws) return null;
      const wsEvents = store.events.filter((e) => e.workspaceId === ws.id);
      return {
        id: ws.id,
        type: ws.type,
        name: ws.name,
        slug: ws.slug,
        ownerUserId: ws.ownerUserId,
        role: membership.role,
        activeEventsCount: wsEvents.filter((e) => e.status === 'published' || e.status === 'live')
          .length,
        upcomingEventsCount: wsEvents.filter((e) => e.status === 'draft').length,
        completedEventsCount: wsEvents.filter((e) => e.status === 'completed').length,
        createdAt: ws.createdAt,
      };
    })
    .filter((item): item is WorkspaceSummary => item !== null);
}

export function getWorkspaceIfAuthorized(
  userId: string,
  workspaceId: string
): WorkspaceSummary | null {
  const all = getAuthorizedWorkspacesForUser(userId);
  return all.find((w) => w.id === workspaceId) ?? null;
}

export function createWorkspaceForUser(params: {
  userId: string;
  type: WorkspaceType;
  name: string;
  slug: string;
  idempotencyKey: string;
}): { workspace: WorkspaceSummary; createdNew: boolean } {
  const store = getStore();

  const existingByIdempotency = store.workspaces.find(
    (w) => w.ownerUserId === params.userId && w.idempotencyKey === params.idempotencyKey
  );
  if (existingByIdempotency) {
    const summary = getWorkspaceIfAuthorized(params.userId, existingByIdempotency.id);
    if (summary) return { workspace: summary, createdNew: false };
  }

  const slugCollision = store.workspaces.find((w) => w.slug === params.slug);
  const finalSlug = slugCollision
    ? `${params.slug}-${Math.random().toString(36).slice(2, 6)}`
    : params.slug;

  const newWorkspaceId = crypto.randomUUID();
  const now = new Date().toISOString();

  store.workspaces.push({
    id: newWorkspaceId,
    type: params.type,
    name: params.name,
    slug: finalSlug,
    ownerUserId: params.userId,
    createdAt: now,
    idempotencyKey: params.idempotencyKey,
  });

  store.workspaceMemberships.push({
    workspaceId: newWorkspaceId,
    userId: params.userId,
    role: 'owner',
    status: 'active',
  });

  const actor = store.users[params.userId];
  store.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    workspaceId: newWorkspaceId,
    eventId: null,
    actorName: actor?.displayName ?? params.userId,
    action: 'workspace.created',
    entityType: 'workspace',
    entityId: newWorkspaceId,
    summary: `Membuat workspace ${params.type === 'wo' ? 'Wedding Organizer' : 'Calon Pengantin'} "${params.name}".`,
    createdAt: now,
  });

  const created = getWorkspaceIfAuthorized(params.userId, newWorkspaceId)!;
  return { workspace: created, createdNew: true };
}

export function getAuthorizedEventsForWorkspace(
  userId: string,
  workspaceId: string
): EventSummary[] | null {
  const ws = getWorkspaceIfAuthorized(userId, workspaceId);
  if (!ws) return null;

  const store = getStore();
  return store.events
    .filter((e) => e.workspaceId === workspaceId)
    .map((e) => {
      recalculateEventMetrics(e.id);
      return {
        ...e,
        myEffectiveRole:
          ws.role === 'owner'
            ? 'workspace_owner'
            : ws.role === 'admin'
            ? 'workspace_admin'
            : 'viewer',
      };
    });
}

export function getAllAuthorizedEventsForUser(userId: string): EventSummary[] {
  const store = getStore();
  const user = store.users[userId];
  const results: EventSummary[] = [];

  for (const event of store.events) {
    recalculateEventMetrics(event.id);
    const wsMembership = store.workspaceMemberships.find(
      (wm) =>
        wm.workspaceId === event.workspaceId && wm.userId === userId && wm.status === 'active'
    );
    const evMembership = store.eventMemberships.find(
      (em) => em.eventId === event.id && em.userId === userId && em.status === 'active'
    );

    const effectiveRole = resolveEffectiveEventRole({
      isPlatformAdmin: false, // Jaga agar simulasi isolasi WO A vs WO B tetap akurat
      workspaceRole: wsMembership?.role ?? null,
      eventRole: evMembership?.role ?? null,
      workspaceType: event.workspaceType,
    });

    if (effectiveRole) {
      results.push({
        ...event,
        myEffectiveRole: effectiveRole,
      });
    } else if (user?.userId === 'user-platform-admin') {
      results.push({
        ...event,
        myEffectiveRole: 'platform_admin',
      });
    }
  }

  return results;
}

export function getEventIfAuthorized(userId: string, eventId: string): EventSummary | null {
  const all = getAllAuthorizedEventsForUser(userId);
  return all.find((e) => e.id === eventId) ?? null;
}

export function createEventInWorkspace(params: {
  userId: string;
  workspaceId: string;
  title: string;
  brideName: string;
  groomName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  venue: string;
  city: string;
  address: string;
  status?: EventStatus;
  planCode?: PlanCode;
}): EventSummary | { error: string } {
  const ws = getWorkspaceIfAuthorized(params.userId, params.workspaceId);
  if (!ws || (ws.role !== 'owner' && ws.role !== 'admin')) {
    return { error: 'Anda tidak memiliki izin untuk membuat acara di workspace ini.' };
  }

  const store = getStore();
  const newEventId = crypto.randomUUID();
  const chosenPlan: PlanCode = params.planCode ?? 'free';
  const newEvent: EventSummary = {
    id: newEventId,
    workspaceId: ws.id,
    workspaceName: ws.name,
    workspaceType: ws.type,
    title: params.title,
    brideName: params.brideName,
    groomName: params.groomName,
    eventDate: params.eventDate,
    startTime: params.startTime,
    endTime: params.endTime,
    timezone: params.timezone,
    venue: params.venue,
    city: params.city,
    address: params.address,
    status: params.status ?? 'published',
    planCode: chosenPlan,
    licenseStatus: 'active',
    myEffectiveRole: ws.role === 'owner' ? 'workspace_owner' : 'workspace_admin',
    metrics: {
      invitationGroupsCount: 0,
      invitedCapacityTotal: 0,
      rsvpAttendingCount: 0,
      checkedInPersonsCount: 0,
      checkedInGroupsCount: 0,
      vipCheckedInCount: 0,
      vipTotalCount: 0,
    },
  };

  store.events.unshift(newEvent);

  const actor = store.users[params.userId];
  store.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    workspaceId: ws.id,
    eventId: newEventId,
    actorName: actor?.displayName ?? params.userId,
    action: 'event.created',
    entityType: 'event',
    entityId: newEventId,
    summary: `Membuat acara baru "${params.title}" (${params.eventDate}) dengan paket awal Free.`,
    createdAt: new Date().toISOString(),
  });

  return newEvent;
}

export function updateEventDetails(params: {
  userId: string;
  eventId: string;
  title: string;
  brideName: string;
  groomName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  venue: string;
  city: string;
  address: string;
  status: EventStatus;
}): EventSummary | { error: string } {
  const existing = getEventIfAuthorized(params.userId, params.eventId);
  if (!existing) {
    return { error: 'Acara tidak ditemukan atau Anda tidak memiliki akses.' };
  }

  const allowedRoles: EffectiveRole[] = [
    'platform_admin',
    'workspace_owner',
    'workspace_admin',
    'event_manager',
    'couple',
  ];
  if (!allowedRoles.includes(existing.myEffectiveRole)) {
    return { error: 'Peran Anda tidak diizinkan mengubah pengaturan acara ini.' };
  }

  if (existing.status === 'archived') {
    return { error: 'Acara yang sudah diarsipkan tidak dapat diubah kembali.' };
  }

  const store = getStore();
  const target = store.events.find((e) => e.id === params.eventId);
  if (!target) return { error: 'Acara tidak ditemukan.' };

  target.title = params.title;
  target.brideName = params.brideName;
  target.groomName = params.groomName;
  target.eventDate = params.eventDate;
  target.startTime = params.startTime;
  target.endTime = params.endTime;
  target.timezone = params.timezone;
  target.venue = params.venue;
  target.city = params.city;
  target.address = params.address;
  target.status = params.status;

  const actor = store.users[params.userId];
  store.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    workspaceId: target.workspaceId,
    eventId: target.id,
    actorName: actor?.displayName ?? params.userId,
    action: 'event.updated',
    entityType: 'event',
    entityId: target.id,
    summary: `Memperbarui detail acara "${target.title}" (status: ${target.status}).`,
    createdAt: new Date().toISOString(),
  });

  return getEventIfAuthorized(params.userId, params.eventId)!;
}

// ============================================================================
// SPRINT 2: MANAJEMEN TAMU, KUOTA, QR TOKEN & HAPUS DATA TESTING
// ============================================================================

export function listInvitationGroupsForEvent(
  userId: string,
  eventId: string,
  filters?: { query?: string; category?: string }
): InvitationGroupDetail[] | null {
  const ev = getEventIfAuthorized(userId, eventId);
  if (!ev) return null;

  recalculateEventMetrics(eventId);
  const store = getStore();
  let list = store.invitationGroups.filter((g) => g.eventId === eventId);

  if (filters?.category && filters.category !== 'all') {
    list = list.filter((g) => g.guestCategory === filters.category);
  }
  if (filters?.query && filters.query.trim().length > 0) {
    const q = filters.query.trim().toLowerCase();
    list = list.filter(
      (g) =>
        g.displayName.toLowerCase().includes(q) ||
        (g.tableLabelOptional && g.tableLabelOptional.toLowerCase().includes(q)) ||
        g.qrTokenPreview.toLowerCase().includes(q)
    );
  }

  return list;
}

export function addInvitationGroupToEvent(params: {
  userId: string;
  eventId: string;
  displayName: string;
  phoneOptional?: string;
  type: InvitationGroupType;
  capacity: number;
  guestCategory: GuestCategory;
  tableLabelOptional?: string;
  notesPrivateOptional?: string;
  allowedPublicDisplay: boolean;
  isTestData?: boolean;
}): { group: InvitationGroupDetail } | { error: string; code?: string } {
  const ev = getEventIfAuthorized(params.userId, params.eventId);
  if (!ev) {
    return { error: 'Acara tidak ditemukan atau Anda tidak memiliki akses.', code: 'NOT_FOUND' };
  }

  if (!hasPermission(ev.myEffectiveRole, 'event:manage_guests')) {
    return {
      error: 'Peran Anda tidak memiliki izin untuk menambah daftar tamu.',
      code: 'FORBIDDEN',
    };
  }

  const store = getStore();
  const currentGroupsCount = store.invitationGroups.filter((g) => g.eventId === ev.id).length;
  const quotaCheck = canAddInvitationGroup(ev.planCode, currentGroupsCount);
  if (!quotaCheck.allowed) {
    return {
      error: quotaCheck.reason ?? 'Batas kuota paket tercapai.',
      code: 'QUOTA_EXCEEDED',
    };
  }

  const cleanName = params.displayName.trim();
  if (cleanName.length < 2) {
    return { error: 'Nama penerima undangan minimal 2 karakter.', code: 'VALIDATION_ERROR' };
  }

  const cap = Math.max(1, Math.min(20, Math.floor(params.capacity)));
  const randomSuffix = generateOpaqueToken(6).toUpperCase();
  const qrTokenPreview = `QR-${randomSuffix}`;
  const publicTokenPreview = `inv-${generateOpaqueToken(9)}`;

  const newGroup: InvitationGroupDetail = {
    id: `grp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    eventId: ev.id,
    displayName: cleanName,
    phoneOptional: params.phoneOptional?.trim() || undefined,
    type: params.type,
    capacity: cap,
    guestCategory: params.guestCategory,
    tableLabelOptional: params.tableLabelOptional?.trim() || undefined,
    notesPrivateOptional: params.notesPrivateOptional?.trim() || undefined,
    allowedPublicDisplay: Boolean(params.allowedPublicDisplay),
    rsvpStatus: 'pending',
    rsvpCount: 0,
    checkedInCount: 0,
    remainingCapacity: cap,
    qrTokenPreview,
    publicTokenPreview,
    tokenVersion: 1,
    isTestData: Boolean(params.isTestData),
    createdAt: new Date().toISOString(),
  };

  store.invitationGroups.unshift(newGroup);
  recalculateEventMetrics(ev.id);

  const actor = store.users[params.userId];
  store.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    workspaceId: ev.workspaceId,
    eventId: ev.id,
    actorName: actor?.displayName ?? params.userId,
    action: 'guest.created',
    entityType: 'invitation_group',
    entityId: newGroup.id,
    summary: `Menambahkan undangan "${newGroup.displayName}" (${newGroup.guestCategory.toUpperCase()}, Kuota ${newGroup.capacity} orang).`,
    createdAt: new Date().toISOString(),
  });

  return { group: newGroup };
}

export function rotateInvitationGroupToken(params: {
  userId: string;
  eventId: string;
  groupId: string;
}): { ok: boolean; error?: string } {
  const ev = getEventIfAuthorized(params.userId, params.eventId);
  if (!ev || !hasPermission(ev.myEffectiveRole, 'event:manage_guests')) {
    return { ok: false, error: 'Anda tidak memiliki izin untuk memutar ulang token QR.' };
  }

  const store = getStore();
  const group = store.invitationGroups.find(
    (g) => g.id === params.groupId && g.eventId === params.eventId
  );
  if (!group) {
    return { ok: false, error: 'Data undangan tidak ditemukan.' };
  }

  group.tokenVersion += 1;
  group.qrTokenPreview = `QR-${generateOpaqueToken(6).toUpperCase()}-V${group.tokenVersion}`;
  group.publicTokenPreview = `inv-${generateOpaqueToken(9)}`;

  const actor = store.users[params.userId];
  store.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    workspaceId: ev.workspaceId,
    eventId: ev.id,
    actorName: actor?.displayName ?? params.userId,
    action: 'invitation.token_rotated',
    entityType: 'invitation_group',
    entityId: group.id,
    summary: `Memutar ulang (rotate) token QR & tautan publik untuk "${group.displayName}" ke versi v${group.tokenVersion}.`,
    createdAt: new Date().toISOString(),
  });

  return { ok: true };
}

// ============================================================================
// SPRINT 3: CHECK-IN HARI-H, KOREKSI SUPERVISOR & RESET DATA TESTING
// ============================================================================

export function recordEventCheckinOrCorrection(params: {
  userId: string;
  eventId: string;
  groupIdOrQrToken: string;
  deltaAttendees: number;
  method: CheckinMethod;
  reasonNullable?: string;
  idempotencyKey: string;
}): {
  ok: boolean;
  message: string;
  group?: InvitationGroupDetail;
  errorCode?: string;
} {
  const ev = getEventIfAuthorized(params.userId, params.eventId);
  if (!ev) {
    return {
      ok: false,
      message: 'Acara tidak ditemukan atau Anda tidak memiliki akses.',
      errorCode: 'NOT_FOUND',
    };
  }

  if (params.method === 'correction') {
    if (!hasPermission(ev.myEffectiveRole, 'event:correct_checkin')) {
      return {
        ok: false,
        message: 'Hanya Supervisor, Manajer Acara, atau Owner WO yang dapat melakukan koreksi.',
        errorCode: 'FORBIDDEN',
      };
    }
    if (!params.reasonNullable || params.reasonNullable.trim().length < 5) {
      return {
        ok: false,
        message: 'Alasan koreksi wajib diisi minimal 5 karakter untuk keperluan audit.',
        errorCode: 'VALIDATION_ERROR',
      };
    }
  } else {
    if (!hasPermission(ev.myEffectiveRole, 'event:scan_checkin')) {
      return {
        ok: false,
        message: 'Peran Anda tidak diizinkan melakukan scan atau check-in tamu.',
        errorCode: 'FORBIDDEN',
      };
    }
  }

  const store = getStore();

  // 1. Cek Idempotency Key
  const duplicateKey = store.checkinLedger.find(
    (entry) => entry.eventId === ev.id && entry.idempotencyKey === params.idempotencyKey
  );
  if (duplicateKey) {
    const existingGroup = store.invitationGroups.find(
      (g) => g.id === duplicateKey.invitationGroupId
    );
    return {
      ok: true,
      message: 'Permintaan duplikat diabaikan (Idempotent Replay) — saldo kehadiran tetap aman.',
      group: existingGroup,
    };
  }

  // 2. Cari grup berdasarkan ID atau QR Token pada acara aktif
  const q = params.groupIdOrQrToken.trim();
  const group = store.invitationGroups.find(
    (g) =>
      g.eventId === ev.id &&
      (g.id === q || g.qrTokenPreview.toLowerCase() === q.toLowerCase())
  );

  if (!group) {
    return {
      ok: false,
      message: 'QR tidak dikenali untuk acara ini. Silakan pindai ulang atau cari nama manual.',
      errorCode: 'NOT_FOUND',
    };
  }

  recalculateEventMetrics(ev.id);
  const nextCount = group.checkedInCount + params.deltaAttendees;

  if (nextCount > group.capacity) {
    return {
      ok: false,
      message:
        group.remainingCapacity === 0
          ? `Semua ${group.capacity} tempat untuk undangan "${group.displayName}" sudah tercatat hadir.`
          : `Jumlah hadir (${nextCount}) melebihi kapasitas undangan (${group.capacity}). Tersisa ${group.remainingCapacity} tempat.`,
      errorCode: 'CAPACITY_EXCEEDED',
    };
  }

  if (nextCount < 0) {
    return {
      ok: false,
      message: 'Total kehadiran tidak boleh kurang dari 0.',
      errorCode: 'VALIDATION_ERROR',
    };
  }

  const actor = store.users[params.userId];
  const entry: CheckinLogViewItem = {
    id: `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    eventId: ev.id,
    invitationGroupId: group.id,
    guestDisplayName: group.displayName,
    guestCategory: group.guestCategory,
    tableLabelOptional: group.tableLabelOptional,
    actorName: actor?.displayName ?? 'Petugas Scanner',
    deltaAttendees: params.deltaAttendees,
    method: params.method,
    reasonNullable: params.reasonNullable?.trim() || null,
    idempotencyKey: params.idempotencyKey,
    createdAt: new Date().toISOString(),
  };

  store.checkinLedger.unshift(entry);
  recalculateEventMetrics(ev.id);

  store.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    workspaceId: ev.workspaceId,
    eventId: ev.id,
    actorName: actor?.displayName ?? params.userId,
    action: params.method === 'correction' ? 'checkin.corrected' : 'checkin.recorded',
    entityType: 'invitation_group',
    entityId: group.id,
    summary:
      params.method === 'correction'
        ? `Koreksi kehadiran ${params.deltaAttendees} orang pada "${group.displayName}". Alasan: ${params.reasonNullable}`
        : `Check-in +${params.deltaAttendees} orang untuk "${group.displayName}" (Total hadir: ${group.checkedInCount}/${group.capacity}).`,
    createdAt: new Date().toISOString(),
  });

  return {
    ok: true,
    message:
      params.method === 'correction'
        ? `Koreksi berhasil disimpan. Total hadir "${group.displayName}" kini ${group.checkedInCount}/${group.capacity} orang.`
        : `Check-in berhasil! "${group.displayName}" tercatat hadir (+${params.deltaAttendees} orang, total ${group.checkedInCount}/${group.capacity}).`,
    group,
  };
}

export function listCheckinLedgerForEvent(
  userId: string,
  eventId: string
): CheckinLogViewItem[] | null {
  const ev = getEventIfAuthorized(userId, eventId);
  if (!ev) return null;
  const store = getStore();
  return store.checkinLedger.filter((l) => l.eventId === eventId);
}

/**
 * Fitur Reset / Hapus Data Testing Sebelum Acara Nyata (Menjawab Poin 5 User)
 * - Mode 'reset_checkins_only': Menghapus seluruh simulasi check-in hari-H menjadi 0 kembali,
 *   tetapi daftar tamu asli tetap utuh.
 * - Mode 'delete_all_test_guests': Menghapus semua tamu simulasi/testing beserta riwayat check-in-nya
 *   sehingga acara bersih 0 tamu dan siap di-import Excel tamu asli klien.
 */
export function purgeEventTestingData(params: {
  userId: string;
  eventId: string;
  mode: 'reset_checkins_only' | 'delete_all_test_guests' | 'restore_demo_samples';
}): { ok: boolean; message: string } {
  const ev = getEventIfAuthorized(params.userId, params.eventId);
  if (!ev) {
    return { ok: false, message: 'Acara tidak ditemukan atau Anda tidak memiliki akses.' };
  }

  const canReset =
    ev.myEffectiveRole === 'workspace_owner' ||
    ev.myEffectiveRole === 'workspace_admin' ||
    ev.myEffectiveRole === 'event_manager' ||
    ev.myEffectiveRole === 'platform_admin';

  if (!canReset) {
    return {
      ok: false,
      message: 'Hanya Pemilik WO atau Manajer Acara yang dapat mereset data simulasi/testing.',
    };
  }

  const store = getStore();
  const actor = store.users[params.userId];

  if (params.mode === 'reset_checkins_only') {
    store.checkinLedger = store.checkinLedger.filter((l) => l.eventId !== ev.id);
    recalculateEventMetrics(ev.id);

    store.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      workspaceId: ev.workspaceId,
      eventId: ev.id,
      actorName: actor?.displayName ?? params.userId,
      action: 'testing_data.checkins_reset',
      entityType: 'event',
      entityId: ev.id,
      summary:
        'Mereset seluruh angka simulasi check-in menjadi 0 (daftar tamu tetap dipertahankan) untuk persiapan Hari-H.',
      createdAt: new Date().toISOString(),
    });

    return {
      ok: true,
      message:
        'Seluruh angka simulasi check-in berhasil di-reset kembali ke 0! Daftar tamu Anda tetap aman.',
    };
  }

  if (params.mode === 'delete_all_test_guests') {
    store.checkinLedger = store.checkinLedger.filter((l) => l.eventId !== ev.id);
    store.invitationGroups = store.invitationGroups.filter((g) => g.eventId !== ev.id);
    recalculateEventMetrics(ev.id);

    store.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      workspaceId: ev.workspaceId,
      eventId: ev.id,
      actorName: actor?.displayName ?? params.userId,
      action: 'testing_data.purged_all',
      entityType: 'event',
      entityId: ev.id,
      summary:
        'Menghapus seluruh daftar tamu testing & riwayat simulasi pada acara ini hingga bersih (0 tamu).',
      createdAt: new Date().toISOString(),
    });

    return {
      ok: true,
      message:
        'Seluruh data tamu testing dan riwayat simulasi check-in berhasil dihapus bersih (0 tamu)! Acara siap diisi data tamu klien asli.',
    };
  }

  // Mode restore_demo_samples
  store.checkinLedger = store.checkinLedger.filter((l) => l.eventId !== ev.id);
  store.invitationGroups = store.invitationGroups.filter((g) => g.eventId !== ev.id);

  const samples = createInitialGuestSamples().map((g) => ({ ...g, eventId: ev.id }));
  store.invitationGroups.push(...samples);
  if (ev.id === 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') {
    store.checkinLedger.push(...createInitialCheckinSamples());
  }
  recalculateEventMetrics(ev.id);

  return {
    ok: true,
    message: 'Data contoh simulasi (3 grup tamu & 1 riwayat scan) berhasil dimuat kembali.',
  };
}

export function getPublicInvitationByToken(rawToken: string): {
  event: EventSummary;
  group: InvitationGroupDetail;
} | null {
  const store = getStore();
  const clean = rawToken.trim();
  const group = store.invitationGroups.find((g) => g.publicTokenPreview === clean);
  if (!group) return null;
  const event = store.events.find((e) => e.id === group.eventId);
  if (!event) return null;
  return { event, group };
}

/**
 * Menghasilkan 6-digit Kode Pairing TV/LED Panggung dari ID Acara
 * sehingga Smart TV atau Laptop Operator Multimedia di Panggung dapat terhubung
 * cukup dengan mengetik 6 angka di halaman `/tv`.
 */
export function getEventTvPairingCode(eventId: string): string {
  let hash = 2166136261;
  for (let i = 0; i < eventId.length; i++) {
    hash ^= eventId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const num = (Math.abs(hash) % 900000) + 100000;
  return String(num);
}

/**
 * Mengambil state layar sambutan TV/LED secara aman tanpa membocorkan catatan privat.
 * Mendukung pencarian berdasarkan `eventId` penuh MAUPUN `6-Digit Kode Pairing TV`.
 */
export function getDisplayScreenState(sessionIdOrEventId: string): {
  event: EventSummary;
  latestPublicWelcome: InvitationGroupDetail | null;
  totalCheckedInPersons: number;
  lastUpdatedIso: string;
} {
  const store = getStore();
  const cleanId = sessionIdOrEventId.trim().replace(/[\s-]/g, '');

  let event = store.events.find(
    (e) =>
      e.id === sessionIdOrEventId.trim() ||
      getEventTvPairingCode(e.id) === cleanId
  );

  if (!event && store.events.length > 0) {
    event = store.events[0]!;
  }

  if (!event) {
    // Jika mulai dari 0 dan belum ada acara yang dibuat sama sekali
    return {
      event: {
        id: 'standby-tv',
        workspaceId: '11111111-1111-4111-8111-111111111111',
        workspaceName: 'SANSTECH Wedding Management System',
        workspaceType: 'wo',
        title: 'Layar Sambutan Siap Dihubungkan',
        brideName: 'Mempelai Wanita',
        groomName: 'Mempelai Pria',
        eventDate: new Date().toISOString().slice(0, 10),
        startTime: '18:00',
        endTime: '21:00',
        timezone: 'Asia/Jakarta',
        venue: 'Silakan Buat Acara Baru di Dashboard WO untuk Menghubungkan Layar TV',
        address: '',
        city: 'Indonesia',
        status: 'published',
        planCode: 'pro_plus',
        licenseStatus: 'active',
        myEffectiveRole: 'guest_public',
        metrics: {
          invitationGroupsCount: 0,
          invitedCapacityTotal: 0,
          rsvpAttendingCount: 0,
          checkedInPersonsCount: 0,
          checkedInGroupsCount: 0,
          vipCheckedInCount: 0,
          vipTotalCount: 0,
        },
      },
      latestPublicWelcome: null,
      totalCheckedInPersons: 0,
      lastUpdatedIso: new Date().toISOString(),
    };
  }

  recalculateEventMetrics(event.id);
  const groups = store.invitationGroups.filter((g) => g.eventId === event!.id);
  const ledger = store.checkinLedger.filter((l) => l.eventId === event!.id);

  const latestPublicWelcome =
    ledger
      .filter((l) => l.deltaAttendees > 0)
      .map((l) => groups.find((g) => g.id === l.invitationGroupId))
      .find((g): g is InvitationGroupDetail => Boolean(g && g.allowedPublicDisplay)) ?? null;

  return {
    event,
    latestPublicWelcome,
    totalCheckedInPersons: event.metrics.checkedInPersonsCount,
    lastUpdatedIso: new Date().toISOString(),
  };
}

export function submitPublicRsvpByToken(params: {
  rawToken: string;
  rsvpStatus: RsvpStatus;
  attendeeCount: number;
  noteOptional?: string;
}): { ok: boolean; message: string; group?: InvitationGroupDetail } {
  const found = getPublicInvitationByToken(params.rawToken);
  if (!found) {
    return { ok: false, message: 'Tautan undangan tidak valid atau telah kedaluwarsa.' };
  }

  const { group, event } = found;
  const count = params.rsvpStatus === 'declined' ? 0 : Math.floor(params.attendeeCount);

  if (count < 0 || count > group.capacity) {
    return {
      ok: false,
      message: `Jumlah kehadiran RSVP tidak boleh melebihi kuota undangan Anda (${group.capacity} orang).`,
    };
  }

  group.rsvpStatus = params.rsvpStatus;
  group.rsvpCount = count;
  group.rsvpNote = params.noteOptional?.trim().slice(0, 300) || undefined;

  recalculateEventMetrics(event.id);
  return {
    ok: true,
    message: 'Terima kasih! Konfirmasi rencana kehadiran (RSVP) Anda telah tersimpan.',
    group,
  };
}

export function updateEventPlanByAdmin(params: {
  actorUserId: string;
  eventId: string;
  planCode: PlanCode;
}): { ok: boolean; message: string } {
  const store = getStore();
  const actor = store.users[params.actorUserId];
  if (!actor?.isPlatformAdmin) {
    return { ok: false, message: 'Hanya Super Admin yang dapat mengaktifkan lisensi paket acara.' };
  }

  const target = store.events.find((e) => e.id === params.eventId);
  if (!target) {
    return { ok: false, message: 'Acara tidak ditemukan.' };
  }

  target.planCode = params.planCode;
  target.licenseStatus = 'active';

  store.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    workspaceId: target.workspaceId,
    eventId: target.id,
    actorName: actor.displayName,
    action: 'license.activated_manual',
    entityType: 'event_license',
    entityId: target.id,
    summary: `Mengaktifkan paket ${params.planCode.toUpperCase()} secara manual untuk acara "${target.title}".`,
    createdAt: new Date().toISOString(),
  });

  return {
    ok: true,
    message: `Paket acara "${target.title}" berhasil diubah menjadi ${params.planCode.toUpperCase()}.`,
  };
}

export function listMemberInvitesForEvent(
  userId: string,
  eventId: string
): MemberInviteItem[] | null {
  const ev = getEventIfAuthorized(userId, eventId);
  if (!ev) return null;

  const store = getStore();
  const now = new Date().toISOString();

  return store.invites
    .filter((inv) => inv.eventId === eventId)
    .map((inv) => {
      let status: MemberInviteItem['status'] = 'pending';
      if (inv.revokedAt) status = 'revoked';
      else if (inv.acceptedAt) status = 'accepted';
      else if (inv.expiresAt < now) status = 'expired';

      return {
        id: inv.id,
        workspaceId: inv.workspaceId,
        eventId: inv.eventId,
        recipientEmail: inv.recipientEmail,
        roleLabel: inv.eventRoleGrant ?? inv.workspaceRoleGrant ?? 'viewer',
        workspaceRoleGrant: inv.workspaceRoleGrant,
        eventRoleGrant: inv.eventRoleGrant,
        status,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
        createdByEmail: inv.createdByEmail,
        inviteUrlPreview: inv.rawTokenForDevPreview
          ? `/onboarding?invite_token=${inv.rawTokenForDevPreview}`
          : undefined,
      };
    });
}

export function createEventMemberInvite(params: {
  actorUserId: string;
  eventId: string;
  recipientEmail: string;
  eventRoleGrant: EventRole;
  ttlHours?: number;
}): { invite: MemberInviteItem; rawToken: string } | { error: string } {
  const ev = getEventIfAuthorized(params.actorUserId, params.eventId);
  if (!ev) {
    return { error: 'Acara tidak ditemukan atau Anda tidak memiliki akses.' };
  }

  const canManageTeam =
    ev.myEffectiveRole === 'workspace_owner' ||
    ev.myEffectiveRole === 'workspace_admin' ||
    ev.myEffectiveRole === 'event_manager' ||
    ev.myEffectiveRole === 'platform_admin';

  if (!canManageTeam) {
    return { error: 'Anda tidak memiliki izin untuk mengundang anggota tim pada acara ini.' };
  }

  const store = getStore();
  const actor = store.users[params.actorUserId];
  const rawToken = generateOpaqueToken(24);
  const tokenHash = hashOpaqueToken(rawToken);
  const ttlMs = (params.ttlHours ?? 72) * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  const now = new Date().toISOString();

  const newInvite: InternalInviteRecord = {
    id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    workspaceId: ev.workspaceId,
    eventId: ev.id,
    recipientEmail: params.recipientEmail.toLowerCase().trim(),
    workspaceRoleGrant: null,
    eventRoleGrant: params.eventRoleGrant,
    tokenHash,
    rawTokenForDevPreview: rawToken,
    expiresAt,
    acceptedAt: null,
    revokedAt: null,
    createdByUserId: params.actorUserId,
    createdByEmail: actor?.email ?? 'admin@sanstech.id',
    createdAt: now,
  };

  store.invites.unshift(newInvite);

  store.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    workspaceId: ev.workspaceId,
    eventId: ev.id,
    actorName: actor?.displayName ?? params.actorUserId,
    action: 'member_invite.created',
    entityType: 'member_invite',
    entityId: newInvite.id,
    summary: `Mengundang ${newInvite.recipientEmail} sebagai ${params.eventRoleGrant}.`,
    createdAt: now,
  });

  const list = listMemberInvitesForEvent(params.actorUserId, params.eventId) ?? [];
  const formatted = list.find((i) => i.id === newInvite.id)!;

  return { invite: formatted, rawToken };
}

export function revokeEventMemberInvite(params: {
  actorUserId: string;
  eventId: string;
  inviteId: string;
}): { ok: boolean; error?: string } {
  const ev = getEventIfAuthorized(params.actorUserId, params.eventId);
  if (!ev) {
    return { ok: false, error: 'Acara tidak ditemukan atau Anda tidak memiliki akses.' };
  }

  const store = getStore();
  const inv = store.invites.find((i) => i.id === params.inviteId && i.eventId === params.eventId);
  if (!inv) {
    return { ok: false, error: 'Data undangan anggota tidak ditemukan.' };
  }

  inv.revokedAt = new Date().toISOString();

  const targetUser = Object.values(store.users).find(
    (u) => u.email.toLowerCase() === inv.recipientEmail.toLowerCase()
  );
  if (targetUser && inv.eventRoleGrant) {
    const membership = store.eventMemberships.find(
      (em) =>
        em.eventId === params.eventId &&
        em.userId === targetUser.userId &&
        em.role === inv.eventRoleGrant
    );
    if (membership) {
      membership.status = 'revoked';
    }
  }

  const actor = store.users[params.actorUserId];
  store.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    workspaceId: ev.workspaceId,
    eventId: ev.id,
    actorName: actor?.displayName ?? params.actorUserId,
    action: 'member_invite.revoked',
    entityType: 'member_invite',
    entityId: inv.id,
    summary: `Mencabut undangan/akses untuk ${inv.recipientEmail}.`,
    createdAt: new Date().toISOString(),
  });

  return { ok: true };
}

export function acceptMemberInviteByToken(params: {
  userId: string;
  rawToken: string;
}): { ok: boolean; eventId?: string | null; workspaceId?: string; error?: string } {
  const store = getStore();
  const tokenHash = hashOpaqueToken(params.rawToken);
  const inv = store.invites.find((i) => i.tokenHash === tokenHash);

  if (!inv) {
    return { ok: false, error: 'Tautan undangan tidak valid atau tidak ditemukan.' };
  }

  if (inv.revokedAt) {
    return { ok: false, error: 'Tautan undangan ini telah dicabut oleh penyelenggara.' };
  }

  if (inv.expiresAt < new Date().toISOString()) {
    return { ok: false, error: 'Tautan undangan ini telah kedaluwarsa.' };
  }

  inv.acceptedAt = new Date().toISOString();

  if (inv.eventId && inv.eventRoleGrant) {
    const existing = store.eventMemberships.find(
      (em) =>
        em.eventId === inv.eventId &&
        em.userId === params.userId &&
        em.role === inv.eventRoleGrant
    );
    if (existing) {
      existing.status = 'active';
    } else {
      store.eventMemberships.push({
        eventId: inv.eventId,
        userId: params.userId,
        role: inv.eventRoleGrant,
        status: 'active',
      });
    }
  }

  return {
    ok: true,
    eventId: inv.eventId,
    workspaceId: inv.workspaceId,
  };
}

export function listAuditLogsForEvent(userId: string, eventId: string): AuditLogItem[] {
  const ev = getEventIfAuthorized(userId, eventId);
  if (!ev) return [];
  const store = getStore();
  return store.auditLogs.filter((log) => log.eventId === eventId);
}
