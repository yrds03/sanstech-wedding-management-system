'use client';

import { useMemo, useState } from 'react';
import { parseGuestImportText, toPreviewLine } from '@/lib/spreadsheet/guest-import';
import { parseXlsxFirstSheet } from '@/lib/spreadsheet/xlsx';

interface BatchImportBoxProps {
  eventId: string;
  maxGroupsLimit: number;
}

export function BatchImportBox({ eventId, maxGroupsLimit }: BatchImportBoxProps) {
  const [csvLines, setCsvLines] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const parsed = useMemo(() => parseGuestImportText(csvLines), [csvLines]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    setFileName(file.name);

    const lowerName = file.name.toLowerCase();
    try {
      if (lowerName.endsWith('.xlsx')) {
        const buffer = new Uint8Array(await file.arrayBuffer());
        const sheetRows = parseXlsxFirstSheet(buffer).filter((r) =>
          r.some((cell) => cell.trim() !== '')
        );
        setCsvLines(sheetRows.map((cells) => toPreviewLine(cells)).join('\n'));
      } else if (lowerName.endsWith('.xls')) {
        setFileName(null);
        setFileError(
          'Format .xls lama tidak didukung. Di Excel pilih File > Save As > "Excel Workbook (.xlsx)" atau "CSV", lalu unggah lagi.'
        );
      } else {
        setCsvLines(await file.text());
      }
    } catch (err) {
      setFileName(null);
      setFileError(
        err instanceof Error ? err.message : 'File tidak dapat dibaca. Coba simpan ulang sebagai .xlsx atau .csv.'
      );
    }
  }

  return (
    <div className="space-y-3 mt-3">
      {/* Langkah 1: Download Template Excel */}
      <div className="rounded-button border border-gold/40 bg-ivory p-3 space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-navy">
          Langkah 1: Unduh Template Excel
        </p>
        <a
          href={`/api/events/${eventId}/guests/template`}
          download="Template_Import_Tamu_SANSTECH.xlsx"
          className="w-full min-h-[38px] inline-flex items-center justify-center rounded-button bg-gold/20 border border-gold px-3 py-2 text-xs font-bold text-navy hover:bg-gold hover:text-navy-dark transition"
        >
          ⬇️ Unduh Template Excel Tamu (.xlsx — kolom otomatis terpisah)
        </a>
        <a
          href={`/api/events/${eventId}/guests/template?format=csv`}
          download="Template_Import_Tamu_SANSTECH.csv"
          className="block text-center text-[11px] font-semibold text-navy/70 underline"
        >
          Lebih suka CSV? Unduh versi .csv
        </a>
      </div>

      {/* Langkah 2: Upload file */}
      <div className="rounded-button border border-border bg-ivory/60 p-3 space-y-1.5">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-navy">
          Langkah 2: Unggah File Excel (.xlsx) / CSV yang Sudah Diisi
        </label>
        <input
          type="file"
          accept=".xlsx,.csv,.txt"
          onChange={(e) => void handleFileUpload(e)}
          className="block w-full text-xs text-ink file:mr-3 file:rounded-button file:border file:border-navy file:bg-navy file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-gold-light hover:file:bg-navy-light cursor-pointer"
        />
        {fileName && !fileError && (
          <p className="text-[11px] font-semibold text-success">
            ✓ File &ldquo;{fileName}&rdquo; terbaca: {parsed.rows.length} tamu siap diimpor.
          </p>
        )}
        {fileError && <p className="text-[11px] font-semibold text-danger">⚠ {fileError}</p>}
      </div>

      {/* Langkah 3: Pratinjau & Submit */}
      <form action={`/api/events/${eventId}/guests`} method="POST" className="space-y-3">
        <input type="hidden" name="action" value="import_csv_lines" />
        <div>
          <label className="block text-[11px] font-semibold text-ink/75 mb-1">
            Urutan kolom:{' '}
            <code>Nama Penerima, Kuota, Kategori (vvip/vip/regular), Meja, TampilTV (ya/tidak), NoWA, CatatanWO</code>
          </label>
          <textarea
            name="csvLines"
            rows={5}
            required
            value={csvLines}
            onChange={(e) => setCsvLines(e.target.value)}
            placeholder={`Boleh tempel langsung dari Excel (copy beberapa sel lalu paste), atau ketik:\nBapak H. Sudirman & Ibu, 2, vvip, Meja VVIP 01, ya\nKeluarga Besar Dr. Hendra, 4, vip, Meja VIP 03, tidak`}
            className="w-full rounded-button border border-border bg-ivory/60 p-3 text-xs font-mono text-ink"
          />
        </div>

        {parsed.rows.length > 0 && (
          <div className="rounded-button border border-border bg-surface overflow-x-auto">
            <p className="px-3 pt-2 text-[11px] font-bold text-navy">
              Pratinjau: {parsed.rows.length} tamu akan diimpor
              {parsed.rows.length > maxGroupsLimit && (
                <span className="text-danger"> (melebihi batas paket {maxGroupsLimit} grup)</span>
              )}
            </p>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left text-ink/60">
                  <th className="px-3 py-1">Nama</th>
                  <th className="px-2 py-1">Kuota</th>
                  <th className="px-2 py-1">Kategori</th>
                  <th className="px-2 py-1">Meja</th>
                  <th className="px-2 py-1">TV</th>
                </tr>
              </thead>
              <tbody>
                {parsed.rows.slice(0, 8).map((row, idx) => (
                  <tr key={`${row.displayName}-${idx}`} className="border-t border-border">
                    <td className="px-3 py-1 font-semibold text-navy">{row.displayName}</td>
                    <td className="px-2 py-1 tabular-nums">{row.capacity}</td>
                    <td className="px-2 py-1 uppercase">{row.guestCategory}</td>
                    <td className="px-2 py-1">{row.tableLabelOptional ?? '-'}</td>
                    <td className="px-2 py-1">{row.allowedPublicDisplay ? 'Ya' : 'Tidak'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsed.rows.length > 8 && (
              <p className="px-3 py-1 text-[11px] text-ink/55">
                … dan {parsed.rows.length - 8} baris lainnya.
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          className="w-full min-h-[42px] rounded-button bg-navy border border-gold/40 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gold-light hover:bg-navy-light transition"
        >
          🚀 Import Semua Baris Sekaligus
        </button>
      </form>

      <p className="text-[11px] text-ink/55">
        *Mendukung .xlsx langsung dari Excel, CSV pemisah koma/titik koma, dan tempel langsung dari
        sel Excel. Baris contoh &ldquo;Contoh: …&rdquo; otomatis diabaikan. Maksimal kuota paket
        saat ini: {maxGroupsLimit} grup.
      </p>
    </div>
  );
}
