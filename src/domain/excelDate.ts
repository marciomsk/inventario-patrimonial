/**
 * Conversão de datas da planilha para ISO 8601 respeitando o instante real.
 *
 * Formatos tratados:
 * - `Date` (quando o XLSX é lido com `cellDates: true`);
 * - serial do Excel (número de dias desde 1899-12-30, sistema 1900);
 * - texto no padrão brasileiro `dd/mm/aaaa hh:mm[:ss]`;
 * - texto ISO ou outro formato reconhecido por `Date`.
 *
 * O serial é somado em milissegundos UTC para não sofrer deslocamento de
 * fuso ou horário de verão. A exibição continua sendo feita no fuso local
 * do dispositivo.
 */

const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 86_400_000;
const MAX_EXCEL_SERIAL = 2_958_466; // 31/12/9999

export function excelSerialToDate(serial: number): Date | null {
  if (!Number.isFinite(serial) || serial <= 0 || serial >= MAX_EXCEL_SERIAL) {
    return null;
  }
  const date = new Date(EXCEL_EPOCH_UTC + Math.round(serial * MS_PER_DAY));
  return Number.isNaN(date.getTime()) ? null : date;
}

const BRAZILIAN_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;

function parseBrazilianDate(text: string): Date | null {
  const match = BRAZILIAN_DATE.exec(text);
  if (!match) return null;
  const [, day, month, year, hour = '0', minute = '0', second = '0'] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

export function excelValueToDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    return excelSerialToDate(value);
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return null;

    const brazilian = parseBrazilianDate(text);
    if (brazilian) return brazilian;

    if (/^\d+(?:\.\d+)?$/.test(text)) {
      const serial = Number(text);
      const fromSerial = excelSerialToDate(serial);
      if (fromSerial) return fromSerial;
    }

    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

export function excelValueToIso(value: unknown): string | null {
  const date = excelValueToDate(value);
  return date ? date.toISOString() : null;
}
