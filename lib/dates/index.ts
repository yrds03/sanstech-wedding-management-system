export const TIMEZONE_LABELS_ID: Record<string, string> = {
  'Asia/Jakarta': 'WIB (Asia/Jakarta)',
  'Asia/Makassar': 'WITA (Asia/Makassar)',
  'Asia/Jayapura': 'WIT (Asia/Jayapura)',
};

/**
 * Memformat tanggal YYYY-MM-DD menjadi format Bahasa Indonesia tanpa pergeseran UTC
 * (Sesuai PRD Bab 10: Tanggal acara tidak boleh bergeser karena interpretasi UTC keliru).
 */
export function formatEventDateId(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  if (!year || !month || !day) return dateStr;

  const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(utcDate);
}

export function formatCurrencyIdr(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

