export const BRAND_NAME = 'SANSTECH Wedding Management System';
export const BRAND_SHORT_NAME = 'SANSTECH WMS';
export const BRAND_TAGLINE =
  'Satu platform untuk mengelola perjalanan tamu, dari menerima undangan sampai pulang dari acara.';

export type WorkspaceType = 'wo' | 'personal';
export type WorkspaceRole = 'owner' | 'admin' | 'member';
export type EventStatus = 'draft' | 'published' | 'live' | 'completed' | 'archived';

export type EventRole =
  | 'event_manager'
  | 'couple'
  | 'supervisor'
  | 'receptionist'
  | 'usher'
  | 'viewer';

export type EffectiveRole =
  | 'platform_admin'
  | 'workspace_owner'
  | 'workspace_admin'
  | EventRole
  | 'guest_public';

export type PlanCode = 'free' | 'pro' | 'pro_plus';

export type InvitationThemeStyle =
  | 'classic_ivory'
  | 'royal_navy_gold'
  | 'emerald_botanical'
  | 'modern_pearl';

/** Konten & desain undangan digital yang dapat dikustomisasi WO (dibatasi per paket). */
export interface InvitationConfig {
  themeStyle: InvitationThemeStyle;
  customGreeting: string;
  quoteText: string;
  dressCode: string;
  mapsUrl: string;
  digitalGiftBank: string;
  closingMessage: string;
  whiteLabelBrandName: string;
}
export type GuestCategory = 'regular' | 'vip' | 'vvip';
export type InvitationGroupType = 'individual' | 'couple' | 'family';
export type RsvpStatus = 'attending' | 'declined' | 'unsure';
export type CheckinMethod = 'qr' | 'manual' | 'correction';
export type LicenseStatus = 'active' | 'pending_manual_payment' | 'expired' | 'revoked';

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  phoneOptional?: string;
  isPlatformAdmin: boolean;
}

export interface WorkspaceSummary {
  id: string;
  type: WorkspaceType;
  name: string;
  slug: string;
  ownerUserId: string;
  role: WorkspaceRole;
  activeEventsCount: number;
  upcomingEventsCount: number;
  completedEventsCount: number;
  createdAt: string;
}

export interface EventSummary {
  id: string;
  workspaceId: string;
  workspaceName: string;
  workspaceType: WorkspaceType;
  title: string;
  brideName: string;
  groomName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  venue: string;
  address: string;
  city: string;
  status: EventStatus;
  planCode: PlanCode;
  invitationConfig?: InvitationConfig;
  licenseStatus: LicenseStatus;
  myEffectiveRole: EffectiveRole;
  metrics: {
    invitationGroupsCount: number;
    invitedCapacityTotal: number;
    rsvpAttendingCount: number;
    checkedInPersonsCount: number;
    checkedInGroupsCount: number;
    vipCheckedInCount: number;
    vipTotalCount: number;
  };
}

export interface InvitationGroupDetail {
  id: string;
  eventId: string;
  displayName: string;
  phoneOptional?: string;
  type: InvitationGroupType;
  capacity: number;
  guestCategory: GuestCategory;
  tableLabelOptional?: string;
  notesPrivateOptional?: string;
  allowedPublicDisplay: boolean;
  rsvpStatus: RsvpStatus | 'pending';
  rsvpCount: number;
  rsvpNote?: string;
  checkedInCount: number;
  remainingCapacity: number;
  qrTokenPreview: string;
  publicTokenPreview: string;
  tokenVersion: number;
  isTestData?: boolean;
  createdAt: string;
}

export interface CheckinLogViewItem {
  id: string;
  eventId: string;
  invitationGroupId: string;
  guestDisplayName: string;
  guestCategory: GuestCategory;
  tableLabelOptional?: string;
  actorName: string;
  deltaAttendees: number;
  method: CheckinMethod;
  reasonNullable: string | null;
  idempotencyKey: string;
  createdAt: string;
}

export interface MemberInviteItem {
  id: string;
  workspaceId: string;
  eventId: string | null;
  recipientEmail: string;
  roleLabel: string;
  workspaceRoleGrant: WorkspaceRole | null;
  eventRoleGrant: EventRole | null;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: string;
  createdAt: string;
  createdByEmail: string;
  inviteUrlPreview?: string;
}

export interface AuditLogItem {
  id: string;
  workspaceId: string | null;
  eventId: string | null;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  createdAt: string;
}
