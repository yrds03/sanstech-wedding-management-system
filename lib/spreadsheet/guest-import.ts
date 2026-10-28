import type { GuestCategory } from '@/lib/types';

export interface GuestImportRow {
  displayName: string;
  capacity: number;
  guestCategory: GuestCategory;
  tableLabelOptional?: string;
  allowedPublicDisplay: boolean;
  phoneOptional?: string;
  notesPrivateOptional?: string;
}

export const GUEST_IMPORT_HEADERS = [
  'Nama Penerima',
  'Kuota',
  'Kategori',
  'Meja',
  'TampilTV',
  'NoWA',
  'CatatanWO',
] as const;

/** Memecah satu baris teks dengan pemisah tertentu, mendukung tanda kutip ganda ala CSV. */
export function splitDelimitedLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      out.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  out.push(current.trim());
  return out;
}

/** Deteksi pemisah: tab (paste langsung dari sel Excel) > titik koma (Excel Indonesia) > koma. */
export function detectDelimiter(line: string): string {
  if (line.includes('\t')) return '\t';
  if (line.includes(';')) return ';';
  return ',';
}

/** Ubah satu baris sel menjadi satu baris teks pratinjau berpemisah titik koma (aman untuk koma pada nama). */
export function toPreviewLine(cells: string[]): string {
  return cells
    .map((c) => (/[;"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c))
    .join(';');
}

export interface ParsedGuestImport {
  rows: GuestImportRow[];
  skippedLines: number;
}

/** Mengurai teks impor tamu (CSV `,` / `;`, tab, atau hasil tempel dari Excel) menjadi baris terstruktur. */
export function parseGuestImportText(rawText: string): ParsedGuestImport {
  const lines = rawText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    // Baris petunjuk Excel `sep=;` / `sep=,` bukan data tamu.
    .filter((l) => !/^sep=.?$/i.test(l));

  const rows: GuestImportRow[] = [];
  let skippedLines = 0;

  for (const line of lines) {
    const parts = splitDelimitedLine(line, detectDelimiter(line));
    const name = (parts[0] ?? '').trim();
    const lower = name.toLowerCase();

    if (
      !name ||
      lower === 'nama_penerima' ||
      lower === 'nama penerima' ||
      lower === 'nama tamu' ||
      lower.startsWith('contoh:')
    ) {
      if (name) skippedLines += 1;
      continue;
    }

    const capacity = Math.min(Math.max(Math.trunc(Number(parts[1])) || 2, 1), 50);
    const catRaw = (parts[2] ?? 'regular').toLowerCase();
    const guestCategory: GuestCategory =
      catRaw === 'vvip' ? 'vvip' : catRaw === 'vip' ? 'vip' : 'regular';
    const tvRaw = (parts[4] ?? 'ya').toLowerCase();

    rows.push({
      displayName: name,
      capacity,
      guestCategory,
      tableLabelOptional: parts[3] || undefined,
      allowedPublicDisplay: ['ya', 'yes', 'true', '1', 'y'].includes(tvRaw),
      phoneOptional: parts[5] || undefined,
      notesPrivateOptional: parts[6] || undefined,
    });
  }

  return { rows, skippedLines };
}

