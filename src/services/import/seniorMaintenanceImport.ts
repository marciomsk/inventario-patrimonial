import { db } from '../../db/database';
import { createId, nowIso } from '../../domain/id';
import { cleanText, normalizePlaqueta, plaquetaKey } from '../../domain/plaqueta';
import type { Maintenance, ImportWarning } from '../../domain/types';

export interface SeniorImportPreview {
  fileName: string;
  fileSize: number;
  maintenances: Omit<Maintenance, 'id' | 'numeroDocumento' | 'createdAt' | 'updatedAt'>[];
  issues: ImportWarning[];
  summary: {
    totalRows: number;
    imported: number;
    skipped: number;
    duplicates: number;
  };
}

/** Converte valor no formato brasileiro ("1.689,00" ou "1689,00" ou "50,00" ou "0,00") para number. */
export function parseBrazilianCurrency(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const str = String(value).trim().replace('R$', '').trim();
  if (!str) return 0;
  const normalized = str.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(normalized);
  return Number.isFinite(num) ? num : 0;
}

/** Converte data DD/MM/AAAA para ISO ao meio-dia local para evitar recuo de UTC-3 */
export function parseSeniorDate(value: unknown): string {
  const str = cleanText(value);
  if (!str || str === '00/00/0000' || str === '__/__/____') return new Date().toISOString();
  const parts = str.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), 12, 0, 0);
    return !Number.isNaN(dateObj.getTime()) ? dateObj.toISOString() : new Date().toISOString();
  }
  return new Date().toISOString();
}

/** Parser CSV linha a linha que respeita campos entre aspas duplas e delimitador automático */
function parseCsvLine(line: string, delimiter = ';'): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map((c) => c.replace(/^"|"$/g, '').trim());
}

export async function parseSeniorMaintenanceCsv(buffer: ArrayBuffer, fileName: string): Promise<SeniorImportPreview> {
  const decoder = new TextDecoder('windows-1252');
  const text = decoder.decode(buffer);
  const rawLines = text.split(/\r?\n/);

  // Detecta automaticamente o delimitador analisando a primeira linha com conteúdo
  let delimiter = ';';
  for (const l of rawLines) {
    const trimmed = l.trim();
    if (trimmed && (trimmed.includes(';') || trimmed.includes(','))) {
      const semicolons = (trimmed.match(/;/g) || []).length;
      const commas = (trimmed.match(/,/g) || []).length;
      if (commas > semicolons && !trimmed.includes(';')) {
        delimiter = ',';
      }
      break;
    }
  }

  const maintenances: Omit<Maintenance, 'id' | 'numeroDocumento' | 'createdAt' | 'updatedAt'>[] = [];
  const issues: ImportWarning[] = [];

  let totalRows = 0;
  let skipped = 0;
  let lastRecord: { manutencaoProposta: string; [key: string]: any } | null = null;

  for (let index = 0; index < rawLines.length; index++) {
    const rawLine = rawLines[index];
    const line = rawLine.trim();
    if (!line) continue;

    const upper = line.toUpperCase();
    if (
      upper.includes('CLUBE RECREATIVO DORES') ||
      upper.includes('SETOR DE MANUTENÇÃO') ||
      upper.includes('PERIODO') ||
      upper.includes('VALORES DAS MANUTENÇÕES') ||
      upper.includes('EQUIP.,DESCRIÇÃO') ||
      upper.includes('VALOR TOTAL') ||
      upper.includes('VMME110.GER') ||
      upper.includes('TOTAIS') ||
      upper.includes('RELATORIO') ||
      upper.includes('EMITIDO EM')
    ) {
      continue;
    }

    const cols = parseCsvLine(rawLine, delimiter);
    const col0 = cols[0] ?? '';
    const isMainRow = cols.length >= 12 && /^\d{4,10}$/.test(col0);

    if (isMainRow) {
      totalRows += 1;
      const plaqueta = normalizePlaqueta(col0);
      const codigoFornecedor = cols[3] || null;
      const mnt = cols[4] || null;
      const descricaoServico = cols[6] || '';
      const dtPecas = parseSeniorDate(cols[7] === '00/00/0000' ? cols[8] : cols[7]);
      const nfPecas = cols[9] || null;
      const valorPecas = parseBrazilianCurrency(cols[10]);
      const nfServicos = cols[11] || null;
      const valorServicos = parseBrazilianCurrency(cols[12] ?? cols[11]);
      const valorOrcado = valorPecas + valorServicos;

      const record = {
        assetId: null,
        plaqueta,
        dataSolicitacao: dtPecas,
        manutencaoProposta: descricaoServico,
        fornecedor: codigoFornecedor ? `Fornecedor Cód. ${codigoFornecedor}` : 'Fornecedor Senior',
        codigoFornecedor,
        numeroManutencaoSenior: mnt,
        nfPecas,
        nfServicos,
        valorPecas,
        valorServicos,
        valorOrcado,
        valorBemNovo: null,
        status: 'CONCLUIDO' as const,
        ocServicos: null,
        ocProdutos: null,
        observacoes: `Importado de VMME110.CSV (Senior) - Mnt: ${mnt || 'N/A'}`,
      };

      maintenances.push(record);
      lastRecord = record;
    } else if (cols.length === 1 && cols[0] && lastRecord) {
      const continuation = cols[0];
      const upperCont = continuation.toUpperCase();
      if (
        !upperCont.includes('CLUBE RECREATIVO') &&
        !upperCont.includes('SETOR DE') &&
        !upperCont.includes('PERIODO') &&
        !upperCont.includes('VALOR TOTAL') &&
        !upperCont.includes('TOTAIS')
      ) {
        lastRecord.manutencaoProposta = `${lastRecord.manutencaoProposta} ${continuation}`;
      }
    } else {
      skipped += 1;
    }
  }

  // Deduplicação contra o banco existente
  const existing = await db.maintenances.toArray();
  const existingKeys = new Set(
    existing.map(
      (m) =>
        `${plaquetaKey(m.plaqueta)}|${m.numeroManutencaoSenior ?? ''}|${m.dataSolicitacao.substring(0, 10)}|${m.valorOrcado}`,
    ),
  );

  let duplicates = 0;
  const filtered: typeof maintenances = [];

  for (const m of maintenances) {
    const k = `${plaquetaKey(m.plaqueta)}|${m.numeroManutencaoSenior ?? ''}|${m.dataSolicitacao.substring(0, 10)}|${m.valorOrcado}`;
    if (existingKeys.has(k)) {
      duplicates += 1;
    } else {
      existingKeys.add(k);
      filtered.push(m);
    }
  }

  return {
    fileName,
    fileSize: buffer.byteLength,
    maintenances: filtered,
    issues,
    summary: {
      totalRows,
      imported: filtered.length,
      skipped,
      duplicates,
    },
  };
}

export async function applySeniorMaintenanceImport(preview: SeniorImportPreview): Promise<number> {
  const assets = await db.assets.toArray();
  const assetMap = new Map<string, string>(); // plaquetaKey -> assetId
  for (const a of assets) {
    assetMap.set(a.plaquetaKey, a.id);
  }

  const now = nowIso();
  const rows: Maintenance[] = [];

  for (const m of preview.maintenances) {
    const assetId = assetMap.get(plaquetaKey(m.plaqueta)) ?? null;
    const numeroDocumento = `Legado Mnt ${m.numeroManutencaoSenior || 'N/A'}`;

    rows.push({
      ...m,
      id: createId(),
      numeroDocumento,
      assetId,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (rows.length > 0) {
    await db.maintenances.bulkAdd(rows);
  }

  return rows.length;
}
