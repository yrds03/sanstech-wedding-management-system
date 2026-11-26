import { routeError } from '@/lib/http';
import { NextResponse } from 'next/server';
import { GUEST_IMPORT_HEADERS } from '@/lib/spreadsheet/guest-import';
import { buildXlsx } from '@/lib/spreadsheet/xlsx';
import {getCurrentUserServer} from '@/lib/auth/session';
import {getEventIfAuthorized} from '@/lib/db/repository';
import {hasPermission} from '@/lib/permissions';

const INSTRUCTION_ROWS: string[][] = [
  ['Petunjuk Pengisian Template Tamu SANSTECH'],
  ['1. Template tidak berisi tamu contoh. Isi data tamu Anda mulai dari baris 2 pada sheet "Data Tamu". Jangan mengubah header.'],
  ['2. Nama Penerima: nama yang dicetak pada satu undangan, untuk satu orang atau satu keluarga.'],
  ['3. Kuota: jumlah orang yang boleh hadir (angka 1 - 20).'],
  ['4. Kategori: isi vvip, vip, atau regular.'],
  ['5. Meja: nama atau nomor meja (boleh dikosongkan).'],
  ['6. TampilTV: isi "ya" jika nama boleh muncul di layar sambutan, "tidak" jika tamu ingin privasi.'],
  ['7. NoWA dan CatatanWO opsional. CatatanWO hanya terlihat oleh tim WO.'],
  ['8. Simpan file sebagai .xlsx (atau .csv), lalu unggah pada menu Tamu > Import Batch.'],
];

export async function GET(request: Request,{params}:{params:Promise<{id:string}>}) {
  try {
  const user=await getCurrentUserServer();
  if(!user)return NextResponse.json({error:{code:'UNAUTHORIZED',message:'Silakan masuk.'}},{status:401});
  const {id}=await params;const event=await getEventIfAuthorized(user.userId,id);
  if(!event || !hasPermission(event.myEffectiveRole,'event:manage_guests'))return NextResponse.json({error:{code:'FORBIDDEN',message:'Akses ditolak.'}},{status:403});

  const format = new URL(request.url).searchParams.get('format');

  if (format === 'csv') {
    // `sep=;` + pemisah titik koma memastikan Excel Windows (locale Indonesia) memecah kolom otomatis.
    const lines = [
      'sep=;',
      [...GUEST_IMPORT_HEADERS].join(';'),
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
      rows: [[...GUEST_IMPORT_HEADERS]],
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

  } catch (error) { return routeError(error); }
}
