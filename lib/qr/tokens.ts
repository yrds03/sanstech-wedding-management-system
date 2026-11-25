import crypto from 'crypto';

/**
 * Menghasilkan token acak kriptografis berentropi tinggi (URL-safe base64).
 * Hash dipakai untuk pencocokan. Token mentah disimpan pada tabel privat agar pengelola
 * dapat mengunduh ulang QR; akses tabel langsung tidak diberikan kepada pengguna API.
 */
export function generateOpaqueToken(byteLength = 24): string {
  return crypto.randomBytes(byteLength).toString('base64url');
}

/**
 * Menghasilkan hash satu arah SHA-256 untuk pencocokan token di database.
 */
export function hashOpaqueToken(rawToken: string): string {
  const pepper = process.env.TOKEN_HASH_PEPPER ?? 'sanstech-weddinghub-default-dev-pepper';
  return crypto
    .createHmac('sha256', pepper)
    .update(rawToken.trim())
    .digest('hex');
}

/**
 * Mencegah Formula Injection (CSV Injection) saat ekspor ke Excel/Spreadsheet (TC-015).
 */
export function sanitizeSpreadsheetCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(str) || /^[\t\r\n]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

