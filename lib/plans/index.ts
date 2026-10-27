import { PlanCode } from '@/lib/types';

export interface PlanDefinition {
  code: PlanCode;
  displayName: string;
  priceIdr: number;
  priceLabel: string;
  subtitle: string;
  limits: {
    maxInvitationGroups: number;
    maxActiveScanners: number;
  };
  features: {
    qrCheckin: boolean;
    manualSearch: boolean;
    importExcel: boolean;
    digitalInvitationLevel: 'Basic' | 'Premium' | 'Custom branding';
    rsvpLevel: 'Basic' | 'Lengkap';
    welcomeDisplay: boolean;
    vipNotification: boolean;
    seatingLevel: 'Tidak tersedia' | 'Basic' | 'Advanced';
    souvenirTracking: boolean;
    exportLevel: 'Basic (CSV)' | 'Lengkap (CSV & Excel)';
    brandingLabel: 'Watermark SANSTECH' | 'Tanpa watermark' | 'White label WO';
  };
}

export const PLANS_CATALOG: Record<PlanCode, PlanDefinition> = {
  free: {
    code: 'free',
    displayName: 'Free',
    priceIdr: 0,
    priceLabel: 'Rp0',
    subtitle: 'Untuk mencoba alur penerimaan tamu',
    limits: {
      maxInvitationGroups: 50,
      maxActiveScanners: 1,
    },
    features: {
      qrCheckin: true,
      manualSearch: true,
      importExcel: false,
      digitalInvitationLevel: 'Basic',
      rsvpLevel: 'Basic',
      welcomeDisplay: false,
      vipNotification: false,
      seatingLevel: 'Tidak tersedia',
      souvenirTracking: false,
      exportLevel: 'Basic (CSV)',
      brandingLabel: 'Watermark SANSTECH',
    },
  },
  pro: {
    code: 'pro',
    displayName: 'Pro',
    priceIdr: 199000,
    priceLabel: 'Rp199.000',
    subtitle: 'Per acara · Cocok untuk pasangan & acara menengah',
    limits: {
      maxInvitationGroups: 500,
      maxActiveScanners: 3,
    },
    features: {
      qrCheckin: true,
      manualSearch: true,
      importExcel: true,
      digitalInvitationLevel: 'Premium',
      rsvpLevel: 'Lengkap',
      welcomeDisplay: true,
      vipNotification: false,
      seatingLevel: 'Basic',
      souvenirTracking: true,
      exportLevel: 'Lengkap (CSV & Excel)',
      brandingLabel: 'Tanpa watermark',
    },
  },
  pro_plus: {
    code: 'pro_plus',
    displayName: 'Pro Plus',
    priceIdr: 499000,
    priceLabel: 'Rp499.000',
    subtitle: 'Per acara · Operasional penuh untuk Wedding Organizer',
    limits: {
      maxInvitationGroups: 2000,
      maxActiveScanners: 10,
    },
    features: {
      qrCheckin: true,
      manualSearch: true,
      importExcel: true,
      digitalInvitationLevel: 'Custom branding',
      rsvpLevel: 'Lengkap',
      welcomeDisplay: true,
      vipNotification: true,
      seatingLevel: 'Advanced',
      souvenirTracking: true,
      exportLevel: 'Lengkap (CSV & Excel)',
      brandingLabel: 'White label WO',
    },
  },
};

export function canAddInvitationGroup(planCode: PlanCode, currentGroupCount: number): {
  allowed: boolean;
  limit: number;
  remaining: number;
  reason?: string;
} {
  const plan = PLANS_CATALOG[planCode];
  const limit = plan.limits.maxInvitationGroups;
  const remaining = Math.max(0, limit - currentGroupCount);
  if (currentGroupCount >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      reason: `Batas ${limit} undangan paket ${plan.displayName} tercapai.`,
    };
  }
  return { allowed: true, limit, remaining };
}

export function canStartScannerSession(planCode: PlanCode, activeSessionsCount: number): {
  allowed: boolean;
  limit: number;
  reason?: string;
} {
  const plan = PLANS_CATALOG[planCode];
  const limit = plan.limits.maxActiveScanners;
  if (activeSessionsCount >= limit) {
    return {
      allowed: false,
      limit,
      reason: `Batas maksimal ${limit} perangkat scanner aktif pada paket ${plan.displayName} telah terpakai.`,
    };
  }
  return { allowed: true, limit };
}

