'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { parseGuestImportText, toPreviewLine } from '@/lib/spreadsheet/guest-import';
import { parseXlsxFirstSheet } from '@/lib/spreadsheet/xlsx';
import {MAX_REQUEST_BYTES, encodedFormSize} from '@/lib/http-limits';

interface BatchImportBoxProps {
  eventId: string;
  maxGroupsLimit: number;
  remainingGroups: number;
  importAllowed: boolean;
}

export function BatchImportBox({ eventId, maxGroupsLimit, remainingGroups, importAllowed }: BatchImportBoxProps) {
  const [csvLines, setCsvLines] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const uploadVersion = useRef(0);
  useEffect(() => {setIsReady(true);}, []);

  const parsed = useMemo(() => parseGuestImportText(csvLines), [csvLines]);
  const requestTooLarge = useMemo(() => encodedFormSize({action: 'import_csv_lines', csvLines}) > MAX_REQUEST_BYTES, [csvLines]);

  if (!importAllowed) return <div className="mt-4 space-y-3 text-sm leading-relaxed"><p>Impor CSV/Excel tersedia pada paket Pro dan Pro Plus. Pada Free, tambahkan tamu satu per satu melalui formulir di samping. Batas Free tetap {maxGroupsLimit} grup.</p><Link href={`/app/e/${eventId}/plan`} className="inline-block underline text-navy">Lihat paket acara</Link></div>;

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const version = ++uploadVersion.current;
    const file = e.target.files?.[0];
    setCsvLines(''); setFileName(null); setFileError(null); setIsReading(false);
    if (!file) return;
    if(file.size>5*1024*1024){setFileError('Ukuran file maksimal 5 MB.');return;}
    setFileName(file.name);
    setIsReading(true);

    const lowerName = file.name.toLowerCase();
    try {
      if (lowerName.endsWith('.xlsx')) {
        const buffer = new Uint8Array(await file.arrayBuffer());
        const sheetRows = parseXlsxFirstSheet(buffer).filter((r) =>
          r.some((cell) => cell.trim() !== '')
        );
        if (version === uploadVersion.current) setCsvLines(sheetRows.map((cells) => toPreviewLine(cells)).join('\n'));
      } else if (lowerName.endsWith('.xls')) {
        setFileName(null);
        setFileError(
          'Format .xls lama tidak didukung. Di Excel pilih File > Save As > "Excel Workbook (.xlsx)" atau "CSV", lalu unggah lagi.'
        );
      } else if (lowerName.endsWith('.csv')) {
        const text = await file.text();
        if (version === uploadVersion.current) setCsvLines(text);
      } else {
        setFileError('Gunakan file .xlsx atau .csv.');
      }
    } catch (err) {
      if (version !== uploadVersion.current) return;
      setFileName(null);
      setFileError(
        err instanceof Error ? err.message : 'File tidak dapat dibaca. Coba simpan ulang sebagai .xlsx atau .csv.'
      );
    } finally { if (version === uploadVersion.current) setIsReading(false); }
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
          disabled={!isReady}
          accept=".xlsx,.csv"
          onChange={(e) => void handleFileUpload(e)}
          className="block w-full text-xs text-ink file:mr-3 file:rounded-button file:border file:border-navy file:bg-navy file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-gold-light hover:file:bg-navy-light cursor-pointer"
        />
        {isReading && <p role="status" className="text-sm">Sedang membaca file. Tunggu hingga pratinjau selesai.</p>}
        {fileName && !fileError && !isReading && (
          <p className="text-[11px] font-semibold text-success">
            File &ldquo;{fileName}&rdquo; terbaca: {parsed.rows.length} baris valid. Periksa pratinjau dan pesan validasi sebelum mengimpor.
          </p>
        )}
        {fileError && <p className="text-[11px] font-semibold text-danger">⚠ {fileError}</p>}
      </div>

      {/* Langkah 3: Pratinjau & Submit */}
      <form action={`/api/events/${eventId}/guests`} method="POST" className="space-y-3" aria-busy={isReading}>
        {requestTooLarge && <p role="alert" className="text-sm text-danger">Data impor yang dikirim maksimal 4 MB setelah pengodean formulir. Bagi data menjadi beberapa impor.</p>}
        {parsed.errors.length>0 && <div role="alert" className="text-sm text-danger">{parsed.errors.slice(0,10).map((error,i)=><p key={i}>{error}</p>)}</div>}
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
            disabled={!isReady}
            value={csvLines}
            onChange={(e) => {uploadVersion.current++; setIsReading(false); setFileError(null); setFileName(null); setCsvLines(e.target.value);}}
            placeholder="Tempel baris data tamu Anda dari Excel sesuai urutan kolom di atas. Template yang diunduh hanya berisi header."
            className="w-full rounded-button border border-border bg-ivory/60 p-3 text-xs font-mono text-ink"
          />
        </div>

        {parsed.rows.length > 0 && (
          <div className="rounded-button border border-border bg-surface overflow-x-auto">
            <p className="px-3 pt-2 text-[11px] font-bold text-navy">
              Pratinjau: {parsed.rows.length} tamu akan diimpor
              {parsed.rows.length > remainingGroups && (
                <span className="text-danger"> (melebihi kuota tersisa {remainingGroups} grup)</span>
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
          disabled={!isReady || Boolean(fileError) || isReading || requestTooLarge || parsed.errors.length>0 || !parsed.rows.length || parsed.rows.length>remainingGroups}
          className="w-full min-h-[42px] rounded-button bg-navy border border-gold/40 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gold-light hover:bg-navy-light transition"
        >
          🚀 Import Semua Baris Sekaligus
        </button>
      </form>

      <p className="text-[11px] text-ink/55">
        *Mendukung .xlsx langsung dari Excel, CSV pemisah koma/titik koma, dan tempel langsung dari
        sel Excel. Kuota tersisa: {remainingGroups} dari {maxGroupsLimit} grup. Perubahan bersamaan tetap diperiksa server saat disimpan.
      </p>
    </div>
  );
}
