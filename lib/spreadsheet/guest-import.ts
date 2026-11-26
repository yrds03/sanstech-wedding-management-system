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
  const counts:Record<string,number>={'\t':0,';':0,',':0};let quoted=false;
  for(let i=0;i<line.length;i++){const ch=line[i]!;if(ch==='"'){if(quoted&&line[i+1]==='"'){i++;continue;}quoted=!quoted;}else if(!quoted&&Object.hasOwn(counts,ch))counts[ch]=(counts[ch]??0)+1;}
  return Object.keys(counts).sort((a,b)=>counts[b]!-counts[a]!)[0]??',';
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
  errors: string[];
}

/** Mengurai teks impor tamu (CSV `,` / `;`, tab, atau hasil tempel dari Excel) menjadi baris terstruktur. */
export function parseGuestImportText(rawText: string): ParsedGuestImport {
  if(rawText.length>5*1024*1024) return {rows:[],skippedLines:0,errors:['Ukuran data maksimal 5 MB.']};
  const records:string[]=[];let quoted=false;let record='';
  for(let i=0;i<rawText.length;i++){const ch=rawText[i]!;
    if(ch==='"'){if(quoted&&rawText[i+1]==='"'){record+='""';i++;continue;}quoted=!quoted;}
    if(ch==='\n'&&!quoted){records.push(record);record='';}else record+=ch;
  }
  if(record)records.push(record);
  if(quoted)return {rows:[],skippedLines:0,errors:['Tanda kutip CSV belum ditutup. Periksa kembali file.']};
  const lines = records
    .map(l=>l.replace(/^\uFEFF/,''))
    .map((l) => l.trim())
    .filter(Boolean)
    // Baris petunjuk Excel `sep=;` / `sep=,` bukan data tamu.
    .filter((l) => !/^sep=.?$/i.test(l));

  const rows: GuestImportRow[] = [];
  let skippedLines = 0;
  const errors: string[] = [];

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

    const capacity = Number(parts[1]);
    const catRaw = (parts[2] ?? 'regular').toLowerCase();
    const guestCategory: GuestCategory =
      catRaw === 'vvip' ? 'vvip' : catRaw === 'vip' ? 'vip' : 'regular';
    const tvRaw = (parts[4] ?? 'tidak').toLowerCase();
    if(parts.length>GUEST_IMPORT_HEADERS.length || !['','ya','yes','true','1','y','tidak','no','false','0','n'].includes(tvRaw) ||
      (parts[3]?.length ?? 0)>80 || (parts[5]?.length ?? 0)>40 || (parts[6]?.length ?? 0)>500) {
      errors.push(`Baris ${rows.length+skippedLines+errors.length+1}: periksa jumlah kolom, izin TampilTV (ya/tidak), meja (80 karakter), nomor kontak (40), dan catatan (500).`);continue;
    }
    if(name.length<2 || name.length>160 || !Number.isInteger(capacity) || capacity<1 || capacity>20 || !['regular','vip','vvip','reguler',''].includes(catRaw)) {
      errors.push(`Baris ${rows.length+skippedLines+errors.length+1}: nama, kapasitas (1–20), atau kategori tidak valid.`); continue;
    }
    if(rows.length>=2000){errors.push('Maksimal 2.000 baris per impor.');break;}

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

  return { rows, skippedLines, errors };
}

