import { EffectiveRole, EventRole, WorkspaceRole, WorkspaceType } from '@/lib/types';

export type PermissionAction =
  | 'workspace:create_event'
  | 'workspace:manage_members'
  | 'workspace:edit_settings'
  | 'event:view_overview'
  | 'event:edit_details'
  | 'event:manage_guests'
  | 'event:import_export_guests'
  | 'event:manage_team'
  | 'event:scan_checkin'
  | 'event:correct_checkin'
  | 'event:configure_display'
  | 'event:view_vip_queue'
  | 'event:manage_plan'
  | 'event:view_reports';

const ROLE_PERMISSION_MATRIX: Record<EffectiveRole, PermissionAction[]> = {
  platform_admin: [
    'workspace:create_event',
    'workspace:manage_members',
    'workspace:edit_settings',
    'event:view_overview',
    'event:edit_details',
    'event:manage_guests',
    'event:import_export_guests',
    'event:manage_team',
    'event:scan_checkin',
    'event:correct_checkin',
    'event:configure_display',
    'event:view_vip_queue',
    'event:manage_plan',
    'event:view_reports',
  ],
  workspace_owner: [
    'workspace:create_event',
    'workspace:manage_members',
    'workspace:edit_settings',
    'event:view_overview',
    'event:edit_details',
    'event:manage_guests',
    'event:import_export_guests',
    'event:manage_team',
    'event:scan_checkin',
    'event:correct_checkin',
    'event:configure_display',
    'event:view_vip_queue',
    'event:manage_plan',
    'event:view_reports',
  ],
  workspace_admin: [
    'workspace:create_event',
    'workspace:manage_members',
    'workspace:edit_settings',
    'event:view_overview',
    'event:edit_details',
    'event:manage_guests',
    'event:import_export_guests',
    'event:manage_team',
    'event:scan_checkin',
    'event:correct_checkin',
    'event:configure_display',
    'event:view_vip_queue',
    'event:view_reports',
  ],
  event_manager: [
    'event:view_overview',
    'event:edit_details',
    'event:manage_guests',
    'event:import_export_guests',
    'event:manage_team',
    'event:scan_checkin',
    'event:correct_checkin',
    'event:configure_display',
    'event:view_vip_queue',
    'event:view_reports',
  ],
  couple: [
    'event:view_overview',
    'event:edit_details',
    'event:manage_guests',
    'event:import_export_guests',
    'event:configure_display',
    'event:view_vip_queue',
    'event:view_reports',
  ],
  supervisor: [
    'event:view_overview',
    'event:scan_checkin',
    'event:correct_checkin',
    'event:configure_display',
    'event:view_vip_queue',
    'event:view_reports',
  ],
  receptionist: [
    'event:view_overview',
    'event:scan_checkin',
  ],
  usher: [
    'event:view_overview',
    'event:view_vip_queue',
  ],
  viewer: [
    'event:view_overview',
    'event:view_reports',
  ],
  guest_public: [],
};

export function hasPermission(
  role: EffectiveRole,
  action: PermissionAction,
  options?: { isPersonalWorkspaceOwner?: boolean }
): boolean {
  if (role === 'couple' && action === 'event:manage_plan' && options?.isPersonalWorkspaceOwner) {
    return true;
  }
  if (role === 'couple' && action === 'workspace:create_event' && options?.isPersonalWorkspaceOwner) {
    return true;
  }
  const allowedActions = ROLE_PERMISSION_MATRIX[role] ?? [];
  return allowedActions.includes(action);
}

/**
 * Mencegah privilege escalation saat mengundang anggota tim baru (PRD ORG-02 & S19).
 * Pengundang tidak boleh memberikan role lebih tinggi dari dirinya sendiri.
 */
const ROLE_RANK: Record<EffectiveRole, number> = {
  platform_admin: 100,
  workspace_owner: 90,
  workspace_admin: 80,
  event_manager: 70,
  couple: 60,
  supervisor: 50,
  receptionist: 40,
  usher: 30,
  viewer: 20,
  guest_public: 0,
};

export function canInviteWithEventRole(
  inviterRole: EffectiveRole,
  targetEventRole: EventRole
): boolean {
  if (!hasPermission(inviterRole, 'event:manage_team') && !hasPermission(inviterRole, 'workspace:manage_members')) {
    return false;
  }
  return ROLE_RANK[inviterRole] >= ROLE_RANK[targetEventRole];
}

export function canInviteWithWorkspaceRole(
  inviterRole: EffectiveRole,
  targetWorkspaceRole: WorkspaceRole
): boolean {
  if (!hasPermission(inviterRole, 'workspace:manage_members')) {
    return false;
  }
  if (targetWorkspaceRole === 'owner') {
    return inviterRole === 'workspace_owner' || inviterRole === 'platform_admin';
  }
  if (targetWorkspaceRole === 'admin') {
    return inviterRole === 'workspace_owner' || inviterRole === 'workspace_admin' || inviterRole === 'platform_admin';
  }
  return true;
}

export function resolveEffectiveEventRole(params: {
  isPlatformAdmin?: boolean;
  workspaceRole?: WorkspaceRole | null;
  eventRole?: EventRole | null;
  workspaceType?: WorkspaceType;
}): EffectiveRole | null {
  if (params.isPlatformAdmin) return 'platform_admin';
  if (params.workspaceRole === 'owner') return 'workspace_owner';
  if (params.workspaceRole === 'admin') return 'workspace_admin';
  if (params.eventRole) return params.eventRole;
  if (params.workspaceRole === 'member') return 'viewer';
  return null;
}

export const ROLE_LABELS_ID: Record<EffectiveRole, string> = {
  platform_admin: 'Admin Platform',
  workspace_owner: 'Pemilik Workspace',
  workspace_admin: 'Admin WO',
  event_manager: 'Manajer Acara',
  couple: 'Calon Pengantin',
  supervisor: 'Supervisor Hari-H',
  receptionist: 'Petugas Penerima Tamu (Scanner)',
  usher: 'Tim Usher VIP',
  viewer: 'Pengamat Laporan',
  guest_public: 'Tamu Undangan',
};
