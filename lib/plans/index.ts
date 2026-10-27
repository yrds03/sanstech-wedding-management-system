import { PlanCode } from '@/lib/types';
import { formatCurrencyIdr } from '@/lib/dates';

export interface PlanDefinition {
  code: PlanCode;
  displayName: string;
  priceIdr: number;
  priceLabel: string;
  subtitle: string;
  postEventGraceDays: number;
  limits: {
    maxInvitationGroups: number;
    maxActiveScanners: number;
  };
  features: {
    qrCheckin: boolean;
    manualSearch: boolean;
    importExcel: boolean;
    digitalInvitationLevel: 'Basic' | 'Premium' | 'Custom Luxury Branding';
    rsvpLevel: 'Basic' | 'Lengkap';
    welcomeDisplay: boolean;
    vipNotification: boolean;
    seatingLevel: 'Tidak tersedia' | 'Basic' | 'Advanced';
    souvenirTracking: boolean;
    exportLevel: 'Basic (CSV)' | 'Lengkap (CSV & Excel)';
    brandingLabel: 'Watermark SANSTECH' | 'Tanpa watermark' | 'White label WO';
  };
}

export interface PostEventRetentionConfig {
  /**
   * Berapa hari setelah tanggal acara (H+N) pasangan/staf masih bisa membuka acara
   * untuk melihat & mengunduh laporan akhir sebelum acara dikunci otomatis (Auto-Expired/Archived).
   * - Selama masa tenggang (H+1 s/d H+graceDays): Mode Baca & Unduh Laporan (Read-Only, tidak bisa check-in lagi).
   * - Setelah lewat H+graceDays: Akses acara untuk pasangan/staf dinonaktifkan otomatis (Auto-Locked),
   *   kecuali diperpanjang oleh Admin Platform / Owner WO.
   */
  gracePeriodDaysAfterEvent: number;
  readOnlyImmediatelyAfterEventDay: boolean;
}

interface GlobalPricingAndRetentionStore {
  proPriceIdr: number;
  proPlusPriceIdr: number;
  proMaxGroups: number;
  proPlusMaxGroups: number;
  retention: PostEventRetentionConfig;
}

const globalPricing = globalThis as unknown as {
  __sanstechPricingStore?: GlobalPricingAndRetentionStore;
};

function getPricingStore(): GlobalPricingAndRetentionStore {
  if (!globalPricing.__sanstechPricingStore) {
    globalPricing.__sanstechPricingStore = {
      // Harga default baru yang lebih masuk akal untuk segmen Wedding B2B/B2C Premium
      // (Dapat diubah kapan saja lewat menu /admin oleh Super Admin)
      proPriceIdr: 1490000, // Rp1.490.000 / acara
      proPlusPriceIdr: 3490000, // Rp3.490.000 / acara
      proMaxGroups: 500,
      proPlusMaxGroups: 2000,
      retention: {
        gracePeriodDaysAfterEvent: 14, // Default 14 hari setelah hari-H masih bisa unduh laporan, lalu nonaktif otomatis
        readOnlyImmediatelyAfterEventDay: true,
      },
    };
  }
  return globalPricing.__sanstechPricingStore;
}

export function getPlansCatalog(): Record<PlanCode, PlanDefinition> {
  const store = getPricingStore();

  return {
    free: {
      code: 'free',
      displayName: 'Free Trial / Intimate',
      priceIdr: 0,
      priceLabel: 'Rp0',
      subtitle: 'Untuk simulasi internal WO & uji coba sistem',
      postEventGraceDays: 3,
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
      displayName: 'Signature Pro',
      priceIdr: store.proPriceIdr,
      priceLabel: formatCurrencyIdr(store.proPriceIdr),
      subtitle: 'Per acara · Ideal untuk resepsi pasangan & gedung menengah',
      postEventGraceDays: store.retention.gracePeriodDaysAfterEvent,
      limits: {
        maxInvitationGroups: store.proMaxGroups,
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
      displayName: 'Royal Grand (Pro Plus)',
      priceIdr: store.proPlusPriceIdr,
      priceLabel: formatCurrencyIdr(store.proPlusPriceIdr),
      subtitle: 'Per acara · Full Ballroom, VIP Usher & White-Label WO',
      postEventGraceDays: store.retention.gracePeriodDaysAfterEvent,
      limits: {
        maxInvitationGroups: store.proPlusMaxGroups,
        maxActiveScanners: 10,
      },
      features: {
        qrCheckin: true,
        manualSearch: true,
        importExcel: true,
        digitalInvitationLevel: 'Custom Luxury Branding',
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
}

// Kompatibilitas ekspor statis + dinamis
export const PLANS_CATALOG = getPlansCatalog();

export function updatePlatformPricingAndRetention(params: {
  proPriceIdr: number;
  proPlusPriceIdr: number;
  gracePeriodDaysAfterEvent: number;
}): void {
  const store = getPricingStore();
  if (params.proPriceIdr >= 0) store.proPriceIdr = params.proPriceIdr;
  if (params.proPlusPriceIdr >= 0) store.proPlusPriceIdr = params.proPlusPriceIdr;
  if (params.gracePeriodDaysAfterEvent >= 1 && params.gracePeriodDaysAfterEvent <= 365) {
    store.retention.gracePeriodDaysAfterEvent = params.gracePeriodDaysAfterEvent;
  }
}

export function getPostEventRetentionConfig(): PostEventRetentionConfig {
  return getPricingStore().retention;
}

/**
 * Menghitung status siklus hidup acara berdasarkan tanggal acara (eventDate) dan masa aktif akun pasca-acara.
 */
export function evaluateEventPostLifecycle(params: {
  eventDate: string; // YYYY-MM-DD
  planCode: PlanCode;
  referenceDateStr?: string; // YYYY-MM-DD
}): {
  phase: 'upcoming_or_dday' | 'grace_period_readonly' | 'expired_locked';
  daysSinceEvent: number;
  graceDaysAllowed: number;
  daysRemainingBeforeLock: number;
  canMutateGuestsOrCheckin: boolean;
  canViewAndDownloadReport: boolean;
  badgeLabelId: string;
  explanationId: string;
} {
  const catalog = getPlansCatalog();
  const graceDaysAllowed = catalog[params.planCode].postEventGraceDays;

  const eventUtc = Date.parse(`${params.eventDate}T23:59:59Z`);
  const refDateStr = params.referenceDateStr ?? new Date().toISOString().slice(0, 10);
  const nowUtc = Date.parse(`${refDateStr}T12:00:00Z`);

  const diffDays = Math.floor((nowUtc - eventUtc) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return {
      phase: 'upcoming_or_dday',
      daysSinceEvent: Math.max(0, diffDays),
      graceDaysAllowed,
      daysRemainingBeforeLock: graceDaysAllowed,
      canMutateGuestsOrCheckin: true,
      canViewAndDownloadReport: true,
      badgeLabelId: 'Masa Aktif Penuh',
      explanationId: `Acara aktif penuh hingga hari-H (${params.eventDate}), ditambah masa unduh laporan ${graceDaysAllowed} hari setelah acara.`,
    };
  }

  if (diffDays <= graceDaysAllowed) {
    const remaining = graceDaysAllowed - diffDays;
    return {
      phase: 'grace_period_readonly',
      daysSinceEvent: diffDays,
      graceDaysAllowed,
      daysRemainingBeforeLock: remaining,
      canMutateGuestsOrCheckin: false,
      canViewAndDownloadReport: true,
      badgeLabelId: `Masa Unduh Laporan (Sisa ${remaining} Hari)`,
      explanationId: `Acara telah selesai ${diffDays} hari lalu. Akun pengantin/staf dalam mode Baca & Unduh Laporan selama ${remaining} hari lagi sebelum dinonaktifkan otomatis.`,
    };
  }

  return {
    phase: 'expired_locked',
    daysSinceEvent: diffDays,
    graceDaysAllowed,
    daysRemainingBeforeLock: 0,
    canMutateGuestsOrCheckin: false,
    canViewAndDownloadReport: false,
    badgeLabelId: 'Masa Aktif Acara Berakhir (Nonaktif)',
    explanationId: `Masa aktif ${graceDaysAllowed} hari pasca-acara telah berakhir. Akses pengantin & staf telah dinonaktifkan otomatis demi keamanan privasi data tamu.`,
  };
}

export function canAddInvitationGroup(planCode: PlanCode, currentGroupCount: number): {
  allowed: boolean;
  limit: number;
  remaining: number;
  reason?: string;
} {
  const catalog = getPlansCatalog();
  const plan = catalog[planCode];
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
  const catalog = getPlansCatalog();
  const plan = catalog[planCode];
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
