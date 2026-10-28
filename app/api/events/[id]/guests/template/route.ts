import { NextResponse } from 'next/server';
import { GUEST_IMPORT_HEADERS } from '@/lib/spreadsheet/guest-import';
import { buildXlsx } from '@/lib/spreadsheet/xlsx';

const EXAMPLE_ROWS: Array<Array<string | number>> = [
  ['Contoh: Bapak H. Sudirman & Ibu', 2, 'vvip', 'Meja VVIP 01', 'ya', '081234567890', 'Jemput di lobby utama'],
  ['Contoh: Keluarga Besar Dr. Hendra', 4, 'vip', 'Meja VIP 03', 'tidak', '081298765432', 'Privasi pejabat - jangan tampil di TV'],
  ['Contoh: Siti Rahmawati', 1, 'regular', 'Meja Melati 05', 'ya', '081311223344', 'Sahabat mempelai'],
];

const INSTRUCTION_ROWS: string[][] = [
  ['Petunjuk Pengisian Template Tamu SANSTECH'],
  ['1. Isi data tamu mulai dari baris 2 pada sheet "Data Tamu". Baris yang diawali "Contoh:" otomatis diabaikan saat impor.'],
  ['2. Nama Penerima: nama undangan, mis. "Bapak Budi & Ibu" atau "Keluarga Besar Hartono".'],
  ['3. Kuota: jumlah orang yang boleh hadir (angka 1 - 50).'],
  ['4. Kategori: isi vvip, vip, atau regular.'],
  ['5. Meja: nama atau nomor meja (boleh dikosongkan).'],
  ['6. TampilTV: isi "ya" jika nama boleh muncul di layar sambutan, "tidak" jika tamu ingin privasi.'],
  ['7. NoWA dan CatatanWO opsional. CatatanWO hanya terlihat oleh tim WO.'],
  ['8. Simpan file sebagai .xlsx (atau .csv), lalu unggah pada menu Tamu > Import Batch.'],
];

export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get('format');

  if (format === 'csv') {
    // `sep=;` + pemisah titik koma memastikan Excel Windows (locale Indonesia) memecah kolom otomatis.
    const lines = [
      'sep=;',
      [...GUEST_IMPORT_HEADERS].join(';'),
      ...EXAMPLE_ROWS.map((r) => r.map((c) => String(c)).join(';')),
    ].join('\r\n');

    return new NextResponse(`\uFEFF${lines}`, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="Template_Import_Tamu_SANSTECH.csv"',
        'Cache-Control': 'no-store',
      },
    });
  }

  const xlsx = buildXlsx([
    {
      name: 'Data Tamu',
      rows: [[...GUEST_IMPORT_HEADERS], ...EXAMPLE_ROWS],
      columnWidths: [38, 8, 12, 18, 11, 16, 40],
    },
    { name: 'Petunjuk', rows: INSTRUCTION_ROWS, columnWidths: [120] },
  ]);

  return new NextResponse(new Uint8Array(xlsx).buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Template_Import_Tamu_SANSTECH.xlsx"',
      'Cache-Control': 'no-store',
    },
  });
}
