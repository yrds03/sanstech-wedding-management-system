import { describe, expect, it } from 'vitest';
import { buildXlsx, parseXlsxFirstSheet } from '@/lib/spreadsheet/xlsx';
import { parseGuestImportText } from '@/lib/spreadsheet/guest-import';

describe('spreadsheet xlsx', () => {
  it('round-trips rows so every field stays in its own column', () => {
    const data = buildXlsx([
      {
        name: 'Data Tamu',
        rows: [
          ['Nama Penerima', 'Kuota', 'Kategori'],
          ['Bapak Budi & Ibu <VIP>', 2, 'vvip'],
          ['Keluarga "Hartono"', 4, 'vip'],
        ],
      },
    ]);
    const rows = parseXlsxFirstSheet(data);
    expect(rows[0]).toEqual(['Nama Penerima', 'Kuota', 'Kategori']);
    expect(rows[1]).toEqual(['Bapak Budi & Ibu <VIP>', '2', 'vvip']);
    expect(rows[2]).toEqual(['Keluarga "Hartono"', '4', 'vip']);
  });

  it('rejects non-xlsx binary data with a readable error', () => {
    expect(() => parseXlsxFirstSheet(new Uint8Array([1, 2, 3, 4]))).toThrow();
  });
});

describe('guest import parser', () => {
  it('handles Excel sep= line, semicolons, and ignores example rows', () => {
    const text = [
      'sep=;',
      'Nama Penerima;Kuota;Kategori;Meja;TampilTV;NoWA;CatatanWO',
      'Contoh: Bapak Contoh;2;vvip;Meja 1;ya;0812;-',
      'Bapak Budi;2;VVIP;Meja VVIP 01;ya;0812345;Jemput',
      'Siti;1;regular;;tidak;;',
    ].join('\r\n');
    const { rows } = parseGuestImportText(text);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ displayName: 'Bapak Budi', capacity: 2, guestCategory: 'vvip' });
    expect(rows[1]).toMatchObject({ displayName: 'Siti', allowedPublicDisplay: false });
  });

  it('handles tab-separated paste from Excel cells and quoted commas', () => {
    const { rows } = parseGuestImportText('Dr. Amelia\t2\tvip\tMeja VIP 05\tya');
    expect(rows[0]).toMatchObject({ displayName: 'Dr. Amelia', tableLabelOptional: 'Meja VIP 05' });
    const csv = parseGuestImportText('"Hartono, S.H.",4,vip,Meja 2,ya');
    expect(csv.rows[0]?.displayName).toBe('Hartono, S.H.');
  });
});

