import {
  AuditLogItem,
  EffectiveRole,
  EventRole,
  EventStatus,
  EventSummary,
  MemberInviteItem,
  UserProfile,
  WorkspaceRole,
  WorkspaceSummary,
  WorkspaceType,
} from '@/lib/types';
import { resolveEffectiveEventRole } from '@/lib/permissions';
import { generateOpaqueToken, hashOpaqueToken } from '@/lib/qr/tokens';

/**
 * Repositori Pengembangan Lokal (Development Seed & In-Memory Store)
 * ----------------------------------------------------------------------------
 * Digunakan HANYA ketika pengembangan lokal (`NODE_ENV !== 'production'`) belum
 * memiliki koneksi Supabase aktif, atau untuk pengujian integrasi isolasi multi-tenant
 * (Tenant WO A vs WO B vs Couple).
 *
 * Sesuai AGENTS.md:
 * - Tidak menampilkan dummy rows secara diam-diam di production.
 * - Setiap data contoh ditandai secara eksplisit dengan label `[CONTOH DEV]`.
 * - Menegakkan isolasi akses per user, workspace, dan event secara ketat di sisi server.
 */

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
  invites: InternalInviteRecord[];
  auditLogs: AuditLogItem[];
}

export const DEMO_USERS: Record<string, UserProfile> = {
  'user-wo-a': {
    userId: 'user-wo-a',
    email: 'owner@sanstech-wo.id',
    displayName: 'Raka Pratama (Owner SANSTECH WO)',
    phoneOptional: '081234567890',
    isPlatformAdmin: false,
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
    displayName: 'Platform Admin SANSTECH',
    isPlatformAdmin: true,
  },
};

function createInitialDevState(): StoreState {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    return {
      users: {},
      workspaces: [],
      workspaceMemberships: [],
      events: [],
      eventMemberships: [],
      invites: [],
      auditLogs: [],
    };
  }

  return {
    users: { ...DEMO_USERS },
    workspaces: [
      {
        id: '11111111-1111-4111-8111-111111111111',
        type: 'wo',
        name: 'SANSTECH Signature Organizer [CONTOH DEV]',
        slug: 'sanstech-signature-wo',
        ownerUserId: 'user-wo-a',
        createdAt: '2026-10-20T08:00:00.000Z',
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        type: 'personal',
        name: 'Pernikahan Andi & Putri [CONTOH DEV]',
        slug: 'pernikahan-andi-putri',
        ownerUserId: 'user-couple-andi',
        createdAt: '2026-10-21T09:00:00.000Z',
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        type: 'wo',
        name: 'Lusiana Wedding Planner (Tenant B) [CONTOH DEV]',
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
        workspaceName: 'SANSTECH Signature Organizer [CONTOH DEV]',
        workspaceType: 'wo',
        title: 'Resepsi Andi & Putri [CONTOH DEV]',
        brideName: 'Putri Maharani',
        groomName: 'Andi Wijaya',
        eventDate: '2026-11-20',
        startTime: '18:30',
        endTime: '21:30',
        timezone: 'Asia/Jakarta',
        venue: 'Grand Ballroom Hotel Mulia',
        address: 'Jl. Asia Afrika, Senayan',
        city: 'Jakarta Pusat',
        status: 'published',
        planCode: 'pro_plus',
        licenseStatus: 'active',
        myEffectiveRole: 'workspace_owner',
        metrics: {
          invitationGroupsCount: 145,
          invitedCapacityTotal: 310,
          rsvpAttendingCount: 248,
          checkedInPersonsCount: 0,
          checkedInGroupsCount: 0,
          vipCheckedInCount: 0,
          vipTotalCount: 18,
        },
      },
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        workspaceId: '11111111-1111-4111-8111-111111111111',
        workspaceName: 'SANSTECH Signature Organizer [CONTOH DEV]',
        workspaceType: 'wo',
        title: 'Intimate Wedding Dimas & Intan [CONTOH DEV]',
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
          invitationGroupsCount: 32,
          invitedCapacityTotal: 64,
          rsvpAttendingCount: 40,
          checkedInPersonsCount: 0,
          checkedInGroupsCount: 0,
          vipCheckedInCount: 0,
          vipTotalCount: 5,
        },
      },
      {
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        workspaceId: '33333333-3333-4333-8333-333333333333',
        workspaceName: 'Lusiana Wedding Planner (Tenant B) [CONTOH DEV]',
        workspaceType: 'wo',
        title: 'Royal Wedding Kevin & Clarissa (Tenant B) [CONTOH DEV]',
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
          invitationGroupsCount: 210,
          invitedCapacityTotal: 420,
          rsvpAttendingCount: 380,
          checkedInPersonsCount: 0,
          checkedInGroupsCount: 0,
          vipCheckedInCount: 0,
          vipTotalCount: 25,
        },
      },
    ],
    eventMemberships: [
      // Andi & Putri diundang sebagai 'couple' HANYA pada acara aaaaaaaa-... milik WO A
      {
        eventId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        userId: 'user-couple-andi',
        role: 'couple',
        status: 'active',
      },
    ],
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
        summary: 'Membuat acara Resepsi Andi & Putri dan mengundang pasangan sebagai kolaborator.',
        createdAt: '2026-10-25T14:20:00.000Z',
      },
    ],
  };
}

const globalForStore = globalThis as unknown as { __sanstechStore?: StoreState };

function getStore(): StoreState {
  if (!globalForStore.__sanstechStore) {
    globalForStore.__sanstechStore = createInitialDevState();
  }
  return globalForStore.__sanstechStore;
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

  // Cek idempotency key agar refresh halaman tidak membuat workspace duplikat (FLOW-01 / S1-01)
  const existingByIdempotency = store.workspaces.find(
    (w) => w.ownerUserId === params.userId && w.idempotencyKey === params.idempotencyKey
  );
  if (existingByIdempotency) {
    const summary = getWorkspaceIfAuthorized(params.userId, existingByIdempotency.id);
    if (summary) return { workspace: summary, createdNew: false };
  }

  // Pastikan slug unik
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
    .map((e) => ({
      ...e,
      myEffectiveRole: ws.role === 'owner' ? 'workspace_owner' : ws.role === 'admin' ? 'workspace_admin' : 'viewer',
    }));
}

export function getAllAuthorizedEventsForUser(userId: string): EventSummary[] {
  const store = getStore();
  const user = store.users[userId];
  const results: EventSummary[] = [];

  for (const event of store.events) {
    const wsMembership = store.workspaceMemberships.find(
      (wm) => wm.workspaceId === event.workspaceId && wm.userId === userId && wm.status === 'active'
    );
    const evMembership = store.eventMemberships.find(
      (em) => em.eventId === event.id && em.userId === userId && em.status === 'active'
    );

    const effectiveRole = resolveEffectiveEventRole({
      isPlatformAdmin: user?.isPlatformAdmin,
      workspaceRole: wsMembership?.role ?? null,
      eventRole: evMembership?.role ?? null,
      workspaceType: event.workspaceType,
    });

    if (effectiveRole) {
      results.push({
        ...event,
        myEffectiveRole: effectiveRole,
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
}): EventSummary | { error: string } {
  const ws = getWorkspaceIfAuthorized(params.userId, params.workspaceId);
  if (!ws || (ws.role !== 'owner' && ws.role !== 'admin')) {
    return { error: 'Anda tidak memiliki izin untuk membuat acara di workspace ini.' };
  }

  const store = getStore();
  const newEventId = crypto.randomUUID();
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
    status: params.status ?? 'draft',
    planCode: 'free',
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

  // Jika sebelumnya sudah diterima, cabut juga event_membership terkait
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

