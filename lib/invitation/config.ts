import type { InvitationConfig, InvitationThemeStyle, PlanCode } from '@/lib/types';

export interface InvitationThemeDefinition {
  id: InvitationThemeStyle;
  label: string;
  description: string;
  /** Minimal paket yang membuka tema ini. */
  minPlan: PlanCode;
  /** Kelas Tailwind untuk halaman penuh. */
  pageClass: string;
  headerClass: string;
  accentTextClass: string;
  accentBorderClass: string;
  cardClass: string;
  buttonClass: string;
  swatch: [string, string];
}

export const INVITATION_THEMES: Record<InvitationThemeStyle, InvitationThemeDefinition> = {
  classic_ivory: {
    id: 'classic_ivory',
    label: 'Classic Ivory Heritage',
    description: 'Gading hangat dengan aksen emas klasik. Tema dasar untuk semua paket.',
    minPlan: 'free',
    pageClass: 'bg-gradient-to-b from-[#f6efe2] via-[#fbf7ef] to-[#f1e7d3] text-[#2b2418]',
    headerClass: 'bg-[#3a2f1d] text-[#f6efe2]',
    accentTextClass: 'text-[#9a7b2f]',
    accentBorderClass: 'border-[#c9a54b]/60',
    cardClass: 'bg-white/90',
    buttonClass: 'bg-[#3a2f1d] text-[#f1deaa] hover:bg-[#51422a]',
    swatch: ['#3a2f1d', '#c9a54b'],
  },
  royal_navy_gold: {
    id: 'royal_navy_gold',
    label: 'Royal Navy Gold',
    description: 'Biru malam pekat dan emas mewah — nuansa ballroom hotel bintang lima.',
    minPlan: 'pro',
    pageClass: 'bg-gradient-to-b from-[#07101f] via-[#0f2038] to-[#07101f] text-[#f6efe2]',
    headerClass: 'bg-[#050b16] text-[#f6efe2]',
    accentTextClass: 'text-[#e2c46f]',
    accentBorderClass: 'border-[#e2c46f]/50',
    cardClass: 'bg-[#13243d]/90',
    buttonClass: 'bg-[#e2c46f] text-[#07101f] hover:bg-[#f0d78c]',
    swatch: ['#0f2038', '#e2c46f'],
  },
  emerald_botanical: {
    id: 'emerald_botanical',
    label: 'Emerald Botanical',
    description: 'Hijau zamrud dengan sentuhan champagne — segar, alami, elegan.',
    minPlan: 'pro',
    pageClass: 'bg-gradient-to-b from-[#0c2a22] via-[#14392f] to-[#0c2a22] text-[#f3ecd9]',
    headerClass: 'bg-[#071a15] text-[#f3ecd9]',
    accentTextClass: 'text-[#d8c28a]',
    accentBorderClass: 'border-[#d8c28a]/45',
    cardClass: 'bg-[#16382e]/90',
    buttonClass: 'bg-[#d8c28a] text-[#0c2a22] hover:bg-[#e6d4a3]',
    swatch: ['#14392f', '#d8c28a'],
  },
  modern_pearl: {
    id: 'modern_pearl',
    label: 'Modern Pearl Minimalist',
    description: 'Putih mutiara, tipografi bersih, aksen rose gold — modern dan lapang.',
    minPlan: 'pro',
    pageClass: 'bg-gradient-to-b from-[#f4f4f6] via-white to-[#eceaee] text-[#26242b]',
    headerClass: 'bg-white text-[#26242b] border-b border-[#d9b7a6]/60',
    accentTextClass: 'text-[#b4796a]',
    accentBorderClass: 'border-[#d9b7a6]/70',
    cardClass: 'bg-white',
    buttonClass: 'bg-[#26242b] text-[#f0d3c6] hover:bg-[#3b3842]',
    swatch: ['#26242b', '#d9b7a6'],
  },
};

const PLAN_RANK: Record<PlanCode, number> = { free: 0, pro: 1, pro_plus: 2 };

export function planAtLeast(plan: PlanCode, minimum: PlanCode): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[minimum];
}

export interface InvitationFeatureAccess {
  customTheme: boolean;
  customTexts: boolean;
  mapsLink: boolean;
  digitalGift: boolean;
  whiteLabel: boolean;
  showSanstechWatermark: boolean;
}

export function getInvitationFeatureAccess(plan: PlanCode): InvitationFeatureAccess {
  return {
    customTheme: planAtLeast(plan, 'pro'),
    customTexts: planAtLeast(plan, 'pro'),
    mapsLink: planAtLeast(plan, 'pro'),
    digitalGift: planAtLeast(plan, 'pro_plus'),
    whiteLabel: planAtLeast(plan, 'pro_plus'),
    showSanstechWatermark: !planAtLeast(plan, 'pro'),
  };
}

export const DEFAULT_INVITATION_CONFIG: InvitationConfig = {
  themeStyle: 'classic_ivory',
  customGreeting: 'Dengan penuh sukacita, kami mengundang Anda untuk berbagi kebahagiaan di hari pernikahan kami.',
  quoteText: '',
  dressCode: '',
  mapsUrl: '',
  digitalGiftBank: '',
  closingMessage: 'Merupakan kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.',
  whiteLabelBrandName: '',
};

const MAX_LEN = {
  customGreeting: 280,
  quoteText: 360,
  dressCode: 120,
  mapsUrl: 500,
  digitalGiftBank: 220,
  closingMessage: 320,
  whiteLabelBrandName: 60,
} as const;

function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}

/** Hanya izinkan tautan https ke layanan peta (mencegah tautan phishing/javascript:). */
export function sanitizeMapsUrl(value: unknown): string {
  const raw = cleanText(value, MAX_LEN.mapsUrl);
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return '';
    const host = url.hostname.toLowerCase();
    const allowed =
      host === 'maps.app.goo.gl' ||
      host === 'goo.gl' ||
      host === 'maps.google.com' ||
      host === 'www.google.com' ||
      host === 'google.com' ||
      host === 'g.co' ||
      host.endsWith('.google.com') ||
      host === 'waze.com' ||
      host === 'www.waze.com' ||
      host === 'ul.waze.com';
    return allowed ? url.toString() : '';
  } catch {
    return '';
  }
}

/** Membersihkan input dan memaksa batasan paket (server-authoritative). */
export function sanitizeInvitationConfig(raw: Partial<Record<keyof InvitationConfig, unknown>>, plan: PlanCode): InvitationConfig {
  const access = getInvitationFeatureAccess(plan);
  const requestedTheme = String(raw.themeStyle ?? 'classic_ivory') as InvitationThemeStyle;
  const themeDef = INVITATION_THEMES[requestedTheme];
  const themeStyle: InvitationThemeStyle =
    themeDef && planAtLeast(plan, themeDef.minPlan) ? requestedTheme : 'classic_ivory';

  return {
    themeStyle,
    customGreeting: access.customTexts
      ? cleanText(raw.customGreeting, MAX_LEN.customGreeting) || DEFAULT_INVITATION_CONFIG.customGreeting
      : DEFAULT_INVITATION_CONFIG.customGreeting,
    quoteText: access.customTexts ? cleanText(raw.quoteText, MAX_LEN.quoteText) : '',
    dressCode: access.customTexts ? cleanText(raw.dressCode, MAX_LEN.dressCode) : '',
    mapsUrl: access.mapsLink ? sanitizeMapsUrl(raw.mapsUrl) : '',
    digitalGiftBank: access.digitalGift ? cleanText(raw.digitalGiftBank, MAX_LEN.digitalGiftBank) : '',
    closingMessage: access.customTexts
      ? cleanText(raw.closingMessage, MAX_LEN.closingMessage) || DEFAULT_INVITATION_CONFIG.closingMessage
      : DEFAULT_INVITATION_CONFIG.closingMessage,
    whiteLabelBrandName: access.whiteLabel ? cleanText(raw.whiteLabelBrandName, MAX_LEN.whiteLabelBrandName) : '',
  };
}

export interface PortableInvitationPayload {
  plan: PlanCode;
  config: InvitationConfig;
}

