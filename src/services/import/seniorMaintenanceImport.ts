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

/** Converte valor no formato brasileiro ("1.689,00" ou "1689,00" ou "50,00") para number. */
export function parseBrazilianCurrency(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const str = String(value).trim().replace('R$', '').trim();
  if (!str) return 0;
  // Remove pontos de milhar e substitui vírgula por ponto decimal
  const normalized = str.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(normalized);
  return Number.isFinite(num) ? num : 0;
}

/** Converte data DD/MM/AAAA para ISO ou string padrão */
export function parseSeniorDate(value: unknown): string {
  const str = cleanText(value);
  if (!str || str === '00/00/0000' || str === '__/__/____') return new Date().toISOString();
  const parts = str.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00.000Z`;
  }
  return new Date().toISOString();
}

export async function parseSeniorMaintenanceCsv(buffer: ArrayBuffer, fileName: string): Promise<SeniorImportPreview> {
  const decoder = new TextDecoder('windows-1252');
  const text = decoder.decode(buffer);
  const rawLines = text.split(/\r?\n/);

  const maintenances: Omit<Maintenance, 'id' | 'numeroDocumento' | 'createdAt' | 'updatedAt'>[] = [];
  const issues: ImportWarning[] = [];

  let totalRows = 0;
  let skipped = 0;

  // Guarda o último registro parseado para anexar linhas de continuação de descrição
  let lastRecord: { manutencaoProposta: string; [key: string]: any } | null = null;

  for (let index = 0; index < rawLines.length; index++) {
    const rawLine = rawLines[index];
    const line = rawLine.trim();
    if (!line) continue;

    // Ignora cabeçalhos, rodapés e linhas de totais do relatório Senior VMME110
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
      line.startsWith(';') ||
      line.split(';').every((c) => !c.trim())
    ) {
      continue;
    }

    const cols = rawLine.split(';');
    // Limpa colunas
    const cleanedCols = cols.map((c) => c.trim().replace(/^"|"$/g, ''));

    // Verifica se é uma linha principal de manutenção (coluna 0 é plaqueta numérica ou contém dígitos)
    const col0 = cleanedCols[0] ?? '';
    const isMainRow = /^\d{3,8}$/.test(col0);

    if (isMainRow) {
      totalRows += 1;
      const plaqueta = normalizePlaqueta(col0);
      const codigoFornecedor = cleanedCols[3] || null;
      const mnt = cleanedCols[4] || null;
      const serv = cleanedCols[5] || null;
      const descricaoServico = cleanedCols[6] || '';
      const dtPecas = parseSeniorDate(cleanedCols[7]);
      const nfPecas = cleanedCols[9] || null;
      const valorPecas = parseBrazilianCurrency(cleanedCols[10]);
      const nfServicos = cleanedCols[11] || null;
      const valorServicos = parseBrazilianCurrency(cleanedCols[12]);
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
        ocServicos: serv,
        ocProdutos: null,
        observacoes: `Importado de VMME110.CSV (Senior) - Mnt: ${mnt || 'N/A'}`,
      };

      maintenances.push(record);
      lastRecord = record;
    } else if (cleanedCols.length === 1 && cleanedCols[0] && lastRecord) {
      // Linha de continuação de descrição quebrada pelo gerador Senior
      lastRecord.manutencaoProposta = `${lastRecord.manutencaoProposta} ${cleanedCols[0]}`;
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

  // Gera número de documento base para lote
  const now = nowIso();
  const rows: Maintenance[] = [];

  // Precisamos gerar números de documento sequenciais para cada um
  const baseDocs = await db.maintenances.toArray();
  let maxSeq = 2148;
  const currentYearStr = String(new Date().getFullYear());
  for (const item of baseDocs) {
    if (item.numeroDocumento) {
      const parts = item.numeroDocumento.split('/');
      if (parts.length === 2 && parts[1] === currentYearStr) {
        const seq = parseInt(parts[0], 10);
        if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    }
  }

  let seqCounter = maxSeq;

  for (const m of preview.maintenances) {
    seqCounter += 1;
    const seqPadded = String(seqCounter).padStart(5, '0');
    const numeroDocumento = `${seqPadded}/${currentYearStr}`;
    const assetId = assetMap.get(plaquetaKey(m.plaqueta)) ?? null;

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
