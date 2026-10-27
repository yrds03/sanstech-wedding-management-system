import { NextResponse } from 'next/server';
import { getCurrentUserServer } from '@/lib/auth/session';
import { createAppError, getHttpStatusForError } from '@/lib/errors';
import {
  listCheckinLedgerForEvent,
  listInvitationGroupsForEvent,
} from '@/lib/db/repository';
import { sanitizeSpreadsheetCell } from '@/lib/qr/tokens';

export async function GET(
  _request: Request,
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

  const csvContent = [
    headers.join(','),
    ...rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')),
  ].join('\r\n');

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="Laporan-Kehadiran-SANSTECH-${context.params.id.slice(
        0,
        8
      )}.csv"`,
    },
  });
}

