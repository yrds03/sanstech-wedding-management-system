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

export type AddOnCategory =
  | 'Kuota & Sistem Digital'
  | 'Perangkat Keras (Hardware)'
  | 'Kru & SDM Hari-H'
  | 'Produksi & Kartu Fisik';

export interface AddOnDefinition {
  code: string;
  name: string;
  category: AddOnCategory;
  unitLabel: string;
  priceIdr: number;
  priceFormatted: string;
  description: string;
   deliverableNote: string;
}

export interface PostEventRetentionConfig {
  gracePeriodDaysAfterEvent: number;
  readOnlyImmediatelyAfterEventDay: boolean;
}

interface GlobalPricingAndRetentionStore {
  proPriceIdr: number;
  proPlusPriceIdr: number;
  proMaxGroups: number;
  proPlusMaxGroups: number;
  retention: PostEventRetentionConfig;
  addOnsPrices: Record<string, number>;
}

const DEFAULT_ADDONS_PRICES: Record<string, number> = {
  addon_extra_quota_250: 450000,
  addon_custom_theme: 850000,
  addon_wa_concierge_blast: 650000,
  addon_extend_retention_30d: 350000,
  addon_tablet_scanner_kit: 600000,
  addon_tv_led_welcome_65: 1750000,
  addon_staff_receptionist: 750000,
  addon_staff_vip_usher: 850000,
  addon_printed_qr_cards_100: 550000,
  addon_souvenir_counter_module: 400000,
};

const globalPricing = globalThis as unknown as {
  __sanstechPricingStore?: GlobalPricingAndRetentionStore;
};

function getPricingStore(): GlobalPricingAndRetentionStore {
  if (!globalPricing.__sanstechPricingStore) {
    globalPricing.__sanstechPricingStore = {
      proPriceIdr: 1490000,
      proPlusPriceIdr: 3490000,
      proMaxGroups: 500,
      proPlusMaxGroups: 2000,
      retention: {
        gracePeriodDaysAfterEvent: 14,
        readOnlyImmediatelyAfterEventDay: true,
      },
      addOnsPrices: { ...DEFAULT_ADDONS_PRICES },
    };
  }
  return globalPricing.__sanstechPricingStore;
}

export function getAddOnsCatalog(): AddOnDefinition[] {
  const store = getPricingStore();
  const p = store.addOnsPrices;

  const rawList: Array<Omit<AddOnDefinition, 'priceIdr' | 'priceFormatted'>> = [
    {
      code: 'addon_extra_quota_250',
      name: 'Extra Quota +250 Grup Undangan Unik',
      category: 'Kuota & Sistem Digital',
      unitLabel: 'per 250 grup undangan',
      description:
        'Tambahan kapasitas 250 grup undangan unik beserta kode QR kriptografis tanpa harus berpindah tingkat paket utama.',
      deliverableNote: 'Kuota langsung ditambahkan pada batas undangan acara.',
    },
    {
      code: 'addon_custom_theme',
      name: 'Desain Eksklusif Undangan Digital (Bespoke Theme)',
      category: 'Kuota & Sistem Digital',
      unitLabel: 'per acara',
      description:
        'Kustomisasi tata letak undangan digital mengikuti palet warna dekorasi pelaminan, monograf inisial pasangan, dan galeri foto pre-wedding.',
      deliverableNote: 'Revisi desain maksimal 2 kali sebelum publikasi tautan.',
    },
    {
      code: 'addon_wa_concierge_blast',
      name: 'Jasa Pengiriman Undangan WhatsApp Terverifikasi (500 Nomor)',
      category: 'Kuota & Sistem Digital',
      unitLabel: 'per 500 nomor tujuan',
      description:
        'Layanan asistensi pengiriman tautan undangan personal & kartu QR ke daftar nomor WhatsApp tamu oleh tim admin dengan laporan status terkirim.',
      deliverableNote: 'Memerlukan daftar nomor HP valid H-14 sebelum acara.',
    },
    {
      code: 'addon_souvenir_counter_module',
      name: 'Modul Counter Penukaran Souvenir & Angpao Digital',
      category: 'Kuota & Sistem Digital',
      unitLabel: 'per acara',
      description:
        'Pencatatan pengambilan souvenir agar tidak terjadi pengambilan ganda serta rekonsiliasi jumlah stok souvenir akhir.',
      deliverableNote: 'Termasuk akses 1 akun petugas meja souvenir.',
    },
    {
      code: 'addon_extend_retention_30d',
      name: 'Perpanjangan Masa Aktif Akun & Arsip Laporan (+30 Hari)',
      category: 'Kuota & Sistem Digital',
      unitLabel: 'per +30 hari',
      description:
        'Memperpanjang masa akses unduh laporan dan galeri ucapan RSVP bagi pasangan pengantin setelah masa tenggang standar berakhir.',
      deliverableNote: 'Dapat diperpanjang kapan saja sebelum data diarsipkan.',
    },
    {
      code: 'addon_tablet_scanner_kit',
      name: 'Sewa 1 Unit Tablet Scanner High-Speed + Standing Holder & Modem Backup',
      category: 'Perangkat Keras (Hardware)',
      unitLabel: 'per unit / hari-H',
      description:
        'Paket perangkat iPad/Tablet dengan kamera autofokus cepat, standing meja registrasi elegan, dan koneksi internet seluler cadangan.',
      deliverableNote: 'Instalasi H-2 jam sebelum open gate di lokasi gedung.',
    },
    {
      code: 'addon_tv_led_welcome_65',
      name: 'Sewa Layar Sambutan Smart TV LED 65 Inch + Standing Bracket',
      category: 'Perangkat Keras (Hardware)',
      unitLabel: 'per unit / hari-H',
      description:
        'Layar sambutan resolusi 4K lengkap dengan mini-PC/dongle yang sudah di-pairing langsung ke sistem Welcome Screen acara.',
      deliverableNote: 'Ditempatkan di area foyer / pintu masuk utama ballroom.',
    },
    {
      code: 'addon_staff_receptionist',
      name: 'Petugas Operator Scanner & Registrasi Profesional (1 Shift / 6 Jam)',
      category: 'Kru & SDM Hari-H',
      unitLabel: 'per personel',
      description:
        'Staf terlatih berseragam formal yang mengoperasikan pemindaian QR, pencarian manual, dan penanganan antrean padat di meja penerima tamu.',
      deliverableNote: 'Hadir 2 jam sebelum acara untuk briefing & uji perangkat.',
    },
    {
      code: 'addon_staff_vip_usher',
      name: 'Tim Usher Protokol Penjemputan VVIP & Pendamping Meja',
      category: 'Kru & SDM Hari-H',
      unitLabel: 'per personel',
      description:
        'Staf pendamping khusus yang memegang perangkat notifikasi VIP untuk menyambut dan mengantar tamu kehormatan langsung ke meja VVIP.',
      deliverableNote: 'Koordinasi terhubung langsung dengan koordinator floor WO.',
    },
    {
      code: 'addon_printed_qr_cards_100',
      name: 'Cetak Kartu Akses Fisik QR Code Emboss Gold (Per 100 Kartu)',
      category: 'Produksi & Kartu Fisik',
      unitLabel: 'per 100 kartu cetak',
      description:
        'Kartu fisik kertas bertekstur premium dengan cetakan QR Code unik masing-masing tamu untuk diselipkan ke dalam undangan cetak fisik.',
      deliverableNote: 'Waktu produksi 5–7 hari kerja setelah daftar tamu dikunci.',
    },
  ];

  return rawList.map((item) => {
    const priceIdr = p[item.code] ?? DEFAULT_ADDONS_PRICES[item.code] ?? 500000;
    return {
      ...item,
      priceIdr,
      priceFormatted: formatCurrencyIdr(priceIdr),
    };
  });
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

export const PLANS_CATALOG = getPlansCatalog();

export function updatePlatformPricingAndRetention(params: {
  proPriceIdr: number;
  proPlusPriceIdr: number;
  gracePeriodDaysAfterEvent: number;
  addOnsPrices?: Record<string, number>;
}): void {
  const store = getPricingStore();
  if (params.proPriceIdr >= 0) store.proPriceIdr = params.proPriceIdr;
  if (params.proPlusPriceIdr >= 0) store.proPlusPriceIdr = params.proPlusPriceIdr;
  if (params.gracePeriodDaysAfterEvent >= 1 && params.gracePeriodDaysAfterEvent <= 365) {
    store.retention.gracePeriodDaysAfterEvent = params.gracePeriodDaysAfterEvent;
  }
  if (params.addOnsPrices) {
    for (const [k, v] of Object.entries(params.addOnsPrices)) {
      if (typeof v === 'number' && !Number.isNaN(v) && v >= 0) {
        store.addOnsPrices[k] = v;
      }
    }
  }
}

export function getPostEventRetentionConfig(): PostEventRetentionConfig {
  return getPricingStore().retention;
}

export function evaluateEventPostLifecycle(params: {
  eventDate: string;
  planCode: PlanCode;
  referenceDateStr?: string;
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
