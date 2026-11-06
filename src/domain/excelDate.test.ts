import { describe, expect, it } from 'vitest';
import { excelSerialToDate, excelValueToIso } from './excelDate';

describe('datas da planilha', () => {
  it('converte serial do Excel sem deslocar o dia', () => {
    // 44227 = 31/01/2021 no sistema 1900.
    const date = excelSerialToDate(44227);
    expect(date?.toISOString()).toBe('2021-01-31T00:00:00.000Z');
  });

  it('preserva data e hora de serial fracionário', () => {
    const iso = excelValueToIso(44227.5);
    expect(iso).toBe('2021-01-31T12:00:00.000Z');
  });

  it('aceita Date, texto brasileiro e texto ISO', () => {
    expect(excelValueToIso(new Date('2026-01-10T10:00:00.000Z'))).toBe(
      '2026-01-10T10:00:00.000Z',
    );
    const brazilian = excelValueToIso('31/01/2021 14:40');
    expect(brazilian).not.toBeNull();
    expect(new Date(brazilian!).getDate()).toBe(31);
    expect(new Date(brazilian!).getMonth()).toBe(0);
    expect(excelValueToIso('2021-01-31T18:36:09.000Z')).toBe('2021-01-31T18:36:09.000Z');
  });

  it('rejeita valores vazios ou inválidos', () => {
    expect(excelValueToIso(null)).toBeNull();
    expect(excelValueToIso('')).toBeNull();
    expect(excelValueToIso('sem data')).toBeNull();
    expect(excelValueToIso(-1)).toBeNull();
    expect(excelValueToIso(9999999)).toBeNull();
  });
});
