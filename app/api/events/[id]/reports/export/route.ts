import { NextResponse } from 'next/server';
import { getCurrentUserServer } from '@/lib/auth/session';
import { createAppError, getHttpStatusForError } from '@/lib/errors';
import {
  listCheckinLedgerForEvent,
  listInvitationGroupsForEvent,
} from '@/lib/db/repository';
import { sanitizeSpreadsheetCell } from '@/lib/qr/tokens';
import { buildXlsx } from '@/lib/spreadsheet/xlsx';

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  const user = await getCurrentUserServer();
  if (!user) {
    return NextResponse.json(createAppError('UNAUTHORIZED'), {
      status: getHttpStatusForError('UNAUTHORIZED'),
    });
  }

  const groups = listInvitationGroupsForEvent(user.userId, context.params.id);
  const ledger = listCheckinLedgerForEvent(user.userId, context.params.id);

  if (!groups || !ledger) {
    return NextResponse.json(createAppError('NOT_FOUND'), {
      status: getHttpStatusForError('NOT_FOUND'),
    });
  }

  const headers = [
    'ID_Grup',
    'Nama_Penerima_Undangan',
    'Kategori',
    'Tipe',
    'Kapasitas_Orang',
    'RSVP_Status',
    'RSVP_Jumlah',
    'Hadir_Aktual_Orang',
    'Sisa_Kuota',
    'Meja',
  ];

  const rows = groups.map((g) => [
    sanitizeSpreadsheetCell(g.id),
    sanitizeSpreadsheetCell(g.displayName),
    sanitizeSpreadsheetCell(g.guestCategory.toUpperCase()),
    sanitizeSpreadsheetCell(g.type),
    sanitizeSpreadsheetCell(g.capacity),
    sanitizeSpreadsheetCell(g.rsvpStatus),
    sanitizeSpreadsheetCell(g.rsvpCount),
    sanitizeSpreadsheetCell(g.checkedInCount),
    sanitizeSpreadsheetCell(g.remainingCapacity),
    sanitizeSpreadsheetCell(g.tableLabelOptional ?? '-'),
  ]);

  const baseName = `Laporan-Kehadiran-SANSTECH-${context.params.id.slice(0, 8)}`;

  if (new URL(request.url).searchParams.get('format') === 'csv') {
    // `sep=;` + titik koma: Excel Windows (locale Indonesia) langsung memecah kolom.
    const csvContent = [
      'sep=;',
      headers.join(';'),
      ...rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(';')),
    ].join('\r\n');

    return new NextResponse(`\uFEFF${csvContent}`, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${baseName}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  const numericColumns = new Set([4, 6, 7, 8]);
  const xlsx = buildXlsx([
    {
      name: 'Laporan Kehadiran',
      rows: [
        headers,
        ...rows.map((r) =>
          r.map((cell, idx) =>
            numericColumns.has(idx) && cell !== '' && !Number.isNaN(Number(cell))
              ? Number(cell)
              : cell
          )
        ),
      ],
      columnWidths: [30, 38, 12, 12, 16, 14, 13, 18, 12, 18],
    },
  ]);

  return new NextResponse(new Uint8Array(xlsx).buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${baseName}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}

