import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

/**
 * Penulis & pembaca file Excel (.xlsx) minimal tanpa dependensi berat.
 * - buildXlsx: menghasilkan workbook asli sehingga Microsoft Excel / Google Sheets /
 *   LibreOffice membuka setiap field di KOLOM terpisah (tanpa masalah pemisah regional).
 * - parseXlsxFirstSheet: membaca sheet pertama menjadi matriks string.
 */

export type SpreadsheetCell = string | number;

export interface SpreadsheetSheet {
  name: string;
  rows: SpreadsheetCell[][];
  columnWidths?: number[];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

function columnLetter(index: number): string {
  let n = index;
  let out = '';
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

function columnIndex(letters: string): number {
  let n = 0;
  for (const ch of letters.toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n - 1;
}

function buildSheetXml(sheet: SpreadsheetSheet): string {
  const cols = sheet.columnWidths?.length
    ? `<cols>${sheet.columnWidths
        .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
        .join('')}</cols>`
    : '';

  const rowsXml = sheet.rows
    .map((row, rIdx) => {
      const cells = row
        .map((cell, cIdx) => {
          const ref = `${columnLetter(cIdx)}${rIdx + 1}`;
          const style = rIdx === 0 ? ' s="1"' : '';
          if (typeof cell === 'number' && Number.isFinite(cell)) {
            return `<c r="${ref}"${style}><v>${cell}</v></c>`;
          }
          return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${escapeXml(
            String(cell)
          )}</t></is></c>`;
        })
        .join('');
      return `<row r="${rIdx + 1}">${cells}</row>`;
    })
    .join('');

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    cols +
    `<sheetData>${rowsXml}</sheetData></worksheet>`
  );
}

export function buildXlsx(sheets: SpreadsheetSheet[]): Uint8Array {
  const sheetEntries = sheets.map((s, i) => ({ ...s, id: i + 1 }));

  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    sheetEntries
      .map(
        (s) =>
          `<Override PartName="/xl/worksheets/sheet${s.id}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
      )
      .join('') +
    '</Types>';

  const rootRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>';

  const workbook =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets>${sheetEntries
      .map((s) => `<sheet name="${escapeXml(s.name.slice(0, 31))}" sheetId="${s.id}" r:id="rId${s.id}"/>`)
      .join('')}</sheets></workbook>`;

  const workbookRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    sheetEntries
      .map(
        (s) =>
          `<Relationship Id="rId${s.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${s.id}.xml"/>`
      )
      .join('') +
    `<Relationship Id="rId${sheetEntries.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    '</Relationships>';

  const styles =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>' +
    '<font><b/><sz val="11"/><color rgb="FFF5E6B8"/><name val="Calibri"/></font></fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF0B192C"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>' +
    '</styleSheet>';

  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(contentTypes),
    '_rels/.rels': strToU8(rootRels),
    'xl/workbook.xml': strToU8(workbook),
    'xl/_rels/workbook.xml.rels': strToU8(workbookRels),
    'xl/styles.xml': strToU8(styles),
  };
  for (const s of sheetEntries) {
    files[`xl/worksheets/sheet${s.id}.xml`] = strToU8(buildSheetXml(s));
  }

  return zipSync(files, { level: 6 });
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function collectText(fragment: string): string {
  const parts: string[] = [];
  const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fragment)) !== null) {
    parts.push(decodeXmlEntities(m[1] ?? ""));
  }
  return parts.join('');
}

function parseSharedStrings(xml: string | undefined): string[] {
  if (!xml) return [];
  const out: string[] = [];
  const re = /<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    out.push(collectText(m[1] ?? ""));
  }
  return out;
}

/** Membaca sheet pertama workbook .xlsx menjadi matriks teks. Melempar Error jika file tidak valid. */
export function parseXlsxFirstSheet(data: Uint8Array): string[][] {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(data);
  } catch {
    throw new Error('File Excel tidak dapat dibuka. Pastikan formatnya .xlsx (bukan .xls lama).');
  }

  const read = (path: string): string | undefined =>
    files[path] ? strFromU8(files[path]) : undefined;

  const workbookXml = read('xl/workbook.xml');
  const relsXml = read('xl/_rels/workbook.xml.rels');
  let sheetPath = 'xl/worksheets/sheet1.xml';

  if (workbookXml && relsXml) {
    const sheetTag = /<sheet\s[^>]*r:id="([^"]+)"/.exec(workbookXml);
    if (sheetTag) {
      const relRe = new RegExp(`<Relationship\\s[^>]*Id="${sheetTag[1] ?? ""}"[^>]*>`);
      const relTag = relRe.exec(relsXml);
      const target = relTag ? /Target="([^"]+)"/.exec(relTag[0]) : null;
      if (target) {
        const t = (target[1] ?? "").replace(/^\//, '');
        sheetPath = t.startsWith('xl/') ? t : `xl/${t}`;
      }
    }
  }

  const sheetXml = read(sheetPath);
  if (!sheetXml) {
    throw new Error('Sheet pertama pada file Excel tidak ditemukan.');
  }

  const shared = parseSharedStrings(read('xl/sharedStrings.xml'));
  const rows: string[][] = [];

  const rowRe = /<row(?:\s[^>]*)?>([\s\S]*?)<\/row>/g;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRe.exec(sheetXml)) !== null) {
    const rowInner = rowMatch[1] ?? "";
    const cells: string[] = [];
    const cellRe = /<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRe.exec(rowInner)) !== null) {
      const attrs = cellMatch[1] ?? "";
      const inner = cellMatch[2] ?? '';
      const ref = /r="([A-Z]+)\d+"/.exec(attrs);
      const type = /t="([^"]+)"/.exec(attrs)?.[1];
      const idx = ref ? columnIndex(ref[1] ?? "A") : cells.length;

      let value = '';
      if (type === 's') {
        const v = /<v>([\s\S]*?)<\/v>/.exec(inner);
        value = v ? (shared[Number(v[1])] ?? "") : "";
      } else if (type === 'inlineStr') {
        value = collectText(inner);
      } else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(inner);
        value = v ? decodeXmlEntities(v[1] ?? "") : "";
      }

      while (cells.length < idx) cells.push('');
      cells[idx] = value;
    }
    rows.push(cells);
  }

  return rows;
}
