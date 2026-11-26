import {describe, expect, it} from 'vitest';
import vm from 'node:vm';
import fs from 'node:fs';

function workbook(initial: Record<string, string[][]> = {}) {
  const grids = new Map<string, unknown[][]>(Object.entries(structuredClone(initial)));
  const frozen = new Map<string, number>();
  const sheet = (name: string) => ({
    getLastRow: () => grids.get(name)!.length,
    getRange: (row: number, column: number, rows: number, columns: number) => {
      const range = {
        getDisplayValues: () => Array.from({length: rows}, (_, r) => Array.from({length: columns}, (_, c) => String(grids.get(name)![row - 1 + r]?.[column - 1 + c] ?? ''))),
        setValues: (values: unknown[][]) => {
          const grid = grids.get(name)!;
          values.forEach((cells, r) => {grid[row - 1 + r] ??= []; cells.forEach((value, c) => {grid[row - 1 + r]![column - 1 + c] = value;});});
          return range;
        },
        setFontWeight: () => range, setBackground: () => range, setFontColor: () => range,
      };
      return range;
    },
    setFrozenRows: (rows: number) => {frozen.set(name, rows);},
    autoResizeColumns: () => {},
  });
  const spreadsheet = {getSheetByName: (name: string) => grids.has(name) ? sheet(name) : null,
    insertSheet: (name: string) => {grids.set(name, []); return sheet(name);}};
  const context = vm.createContext({PropertiesService: {getScriptProperties: () => ({getProperty: () => null})},
    LockService: {getScriptLock: () => ({waitLock: () => {}, releaseLock: () => {}})},
    SpreadsheetApp: {openById: () => spreadsheet, flush: () => {}}});
  vm.runInContext(fs.readFileSync('google-apps-script/Code.gs', 'utf8'), context);
  return {run: () => context.setupSpreadsheetHeaders(), grids, frozen};
}

describe('automatic Google Sheets headers', () => {
  it('creates all headers and the dictionary without touching unrelated sheets', () => {
    const book = workbook({Sheet1: [['Data pemilik', 'Tetap ada']]});
    const result = book.run();
    expect(result.ok).toBe(true); expect(result.created).toHaveLength(8);
    expect(book.grids.get('SANSTECH_Tamu')?.[0]).toContain('Kapasitas_Orang');
    expect(book.grids.get('SANSTECH_Checkin')?.[0]).toContain('Kunci_Idempotensi');
    expect(book.grids.get('SANSTECH_Kamus_Kolom')!.length).toBeGreaterThan(50);
    expect(book.grids.get('Sheet1')).toEqual([['Data pemilik', 'Tetap ada']]);
    expect(book.frozen.get('SANSTECH_Tamu')).toBe(1);
  });
  it('is safe to run again and retains existing guest rows', () => {
    const book = workbook(); book.run();
    book.grids.get('SANSTECH_Tamu')!.push(['guest-id', 'event-id', 'Keluarga Budi']);
    const before = structuredClone([...book.grids]);
    expect(book.run().created).toHaveLength(0);
    expect([...book.grids]).toEqual(before);
  });
  it('checks conflicting headers before creating or modifying any table', () => {
    const book = workbook({SANSTECH_Acara: [['Kolom khusus pemilik'], ['Data lama']]});
    const before = structuredClone([...book.grids]);
    expect(() => book.run()).toThrow('Data yang ada tidak diubah');
    expect([...book.grids]).toEqual(before);
  });
});
