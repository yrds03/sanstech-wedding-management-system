import { NextResponse } from 'next/server';

export async function GET() {
  const csvContent = [
    '\uFEFFNama Penerima,Kuota,Kategori,Meja,TampilTV,NoWA,CatatanWO',
    'Contoh: Bapak H. Sudirman & Ibu,2,vvip,Meja VVIP 01,ya,081234567890,Jemput di lobby utama',
    'Contoh: Keluarga Besar Dr. Hendra,4,vip,Meja VIP 03,tidak,081298765432,Privasi pejabat - jangan tampil di TV',
    'Contoh: Siti Rahmawati,1,regular,Meja Melati 05,ya,081311223344,Sahabat mempelai',
  ].join('\r\n');

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="Template_Import_Tamu_SANSTECH.csv"',
      'Cache-Control': 'no-store',
    },
  });
}

