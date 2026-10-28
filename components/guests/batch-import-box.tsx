'use client';

import { useState } from 'react';

interface BatchImportBoxProps {
  eventId: string;
  maxGroupsLimit: number;
}

export function BatchImportBox({ eventId, maxGroupsLimit }: BatchImportBoxProps) {
  const [csvLines, setCsvLines] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result ?? '');
      // Hapus BOM jika ada dan hapus baris header pertama jika dimulai dengan "Nama Penerima"
      const cleaned = text
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => {
          if (!line) return false;
          const lower = line.toLowerCase();
          if (lower.startsWith('nama penerima') || lower.startsWith('nama_penerima')) {
            return false;
          }
          return true;
        })
        .join('\n');
      setCsvLines(cleaned);
    };
    reader.readAsText(file, 'utf-8');
  }

  return (
    <div className="space-y-3 mt-3">
      {/* Langkah 1: Download Template Excel / CSV */}
      <div className="rounded-button border border-gold/40 bg-ivory p-3 space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-navy">
          Langkah 1: Unduh Format Template Excel / CSV
        </p>
        <a
          href={`/api/events/${eventId}/guests/template`}
          download="Template_Import_Tamu_SANSTECH.csv"
          className="w-full min-h-[38px] inline-flex items-center justify-center rounded-button bg-gold/20 border border-gold px-3 py-2 text-xs font-bold text-navy hover:bg-gold hover:text-navy-dark transition"
        >
          ⬇️ Unduh Template Excel / CSV Tamu (.csv)
        </a>
      </div>

      {/* Langkah 2: Upload File Excel CSV yang Sudah Diisi */}
      <div className="rounded-button border border-border bg-ivory/60 p-3 space-y-1.5">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-navy">
          Langkah 2: Upload File CSV dari Excel (Atau Copy-Paste di Bawah)
        </label>
        <input
          type="file"
          accept=".csv,.txt"
          onChange={handleFileUpload}
          className="block w-full text-xs text-ink file:mr-3 file:rounded-button file:border file:border-navy file:bg-navy file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-gold-light hover:file:bg-navy-light cursor-pointer"
        />
        {fileName && (
          <p className="text-[11px] font-semibold text-success">
            ✓ File &ldquo;{fileName}&rdquo; berhasil dibaca ke kotak pratinjau di bawah!
          </p>
        )}
      </div>

      {/* Langkah 3: Kotak Pratinjau & Submit */}
      <form action={`/api/events/${eventId}/guests`} method="POST" className="space-y-3">
        <input type="hidden" name="action" value="import_csv_lines" />
        <div>
          <label className="block text-[11px] font-semibold text-ink/75 mb-1">
            Format Kolom: <code>Nama Penerima, Kuota, Kategori (vvip/vip/regular), Meja, TampilTV (ya/tidak)</code>
          </label>
          <textarea
            name="csvLines"
            rows={5}
            required
            value={csvLines}
            onChange={(e) => setCsvLines(e.target.value)}
            placeholder={`Contoh:\nBapak H. Sudirman & Ibu, 2, vvip, Meja VVIP 01, ya\nKeluarga Besar Dr. Hendra, 4, vip, Meja VIP 03, tidak`}
            className="w-full rounded-button border border-border bg-ivory/60 p-3 text-xs font-mono text-ink"
          />
        </div>
        <button
          type="submit"
          className="w-full min-h-[42px] rounded-button bg-navy border border-gold/40 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gold-light hover:bg-navy-light transition"
        >
          🚀 Import Semua Baris Sekaligus
        </button>
      </form>

      <p className="text-[11px] text-ink/55">
        *Mendukung pemisah koma (<code>,</code>) maupun titik koma (<code>;</code>) dari Microsoft
        Excel. Maksimal kuota paket saat ini: {maxGroupsLimit} grup.
      </p>
    </div>
  );
}

