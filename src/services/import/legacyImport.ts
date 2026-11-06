import * as XLSX from 'xlsx';
import {
  classifyPlaqueta,
  cleanText,
  isLikelyRoomPlate,
  normalizePlaqueta,
  parseLocal,
  plaquetaKey,
} from '../../domain/plaqueta';
import { buildRoomDrafts, countRoomLabels, roomKey } from '../../domain/rooms';
import { excelValueToIso } from '../../domain/excelDate';
import type { ImportWarning, LegacyStatus, ReviewReason } from '../../domain/types';

export interface ParsedAssetRow {
  rowNumber: number;
  plaqueta: string;
  plaquetaKey: string;
  descricao: string;
  localOriginal: string;
  localCodigo: string | null;
  localNome: string;
  idPatrimonio: string | null;
  statusCadastro: string;
  legacyStatus: LegacyStatus;
  legacyUltimaConferencia: string | null;
  legacyAcaoSapiens: string;
  legacyAlerta: string;
  revisaoPendente: boolean;
  revisaoMotivos: ReviewReason[];
}

export interface ParsedEventRow {
  rowNumber: number;
  legacyEventId: string | null;
  plaqueta: string;
  plaquetaKey: string;
  dataHora: string;
  localBipagem: string;
  acaoSapiens: string;
}

export interface LegacyImportPreview {
  fileName: string;
  fileSize: number;
  sheets: string[];
  configSalaAtual: string | null;
  assets: ParsedAssetRow[];
  events: ParsedEventRow[];
  issues: ImportWarning[];
  summary: {
    totalAssetRows: number;
    totalEventRows: number;
    assetsToImport: number;
    eventsToImport: number;
    ignored: number;
    duplicateGroups: number;
    duplicateRows: number;
    roomLikeAssets: number;
    atypicalPlaquetas: number;
    assetsWithoutDescription: number;
    assetsWithoutLocal: number;
    eventDuplicateIds: number;
    eventsMissingDate: number;
    eventsMissingLocal: number;
    futureEvents: number;
    notInCadastro: number;
    divergenceEvents: number;
    repeatedReadRows: number;
    roomsToCreate: number;
    mergedRoomLabels: number;
  };
}

const MAX_ISSUES = 200;

function normalizeHeader(value: unknown): string {
  return cleanText(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeSheetName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');
}

function findSheet(workbook: XLSX.WorkBook, target: string): XLSX.WorkSheet | null {
  const wanted = normalizeSheetName(target);
  for (const name of workbook.SheetNames) {
    if (normalizeSheetName(name) === wanted) return workbook.Sheets[name];
  }
  return null;
}

function sheetRows(sheet: XLSX.WorkSheet | null): unknown[][] {
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: true,
  });
}

function buildColumnMap(headerRow: unknown[]): Map<string, number> {
  const map = new Map<string, number>();
  headerRow.forEach((cell, index) => {
    const key = normalizeHeader(cell);
    if (key && !map.has(key)) map.set(key, index);
  });
  return map;
}

function cell(row: unknown[], columns: Map<string, number>, ...names: string[]): unknown {
  for (const name of names) {
    const index = columns.get(normalizeHeader(name));
    if (index !== undefined) return row[index];
  }
  return null;
}

function isRowEmpty(row: unknown[]): boolean {
  return row.every((value) => cleanText(value) === '');
}

function legacyStatusFrom(value: unknown): LegacyStatus {
  const text = cleanText(value).toLocaleUpperCase('pt-BR');
  if (text.includes('CONFERIDO')) return 'conferido';
  if (text.includes('PENDENTE')) return 'pendente';
  return 'desconhecido';
}

function addIssue(list: ImportWarning[], issue: ImportWarning, counter: { total: number }): void {
  counter.total += 1;
  if (list.length < MAX_ISSUES) list.push(issue);
}

interface ParsedAssetsResult {
  assets: ParsedAssetRow[];
  issues: ImportWarning[];
  totalRows: number;
  ignored: number;
  roomLike: number;
  atypical: number;
  withoutDescription: number;
  withoutLocal: number;
  duplicateGroups: number;
  duplicateRows: number;
}

function parseAssets(sheet: XLSX.WorkSheet, issues: ImportWarning[]): ParsedAssetsResult {
  const rows = sheetRows(sheet);
  const columns = buildColumnMap(rows[0] ?? []);
  if (!columns.has('plaqueta')) {
    throw new Error('A aba Patrimonio nÃ£o possui a coluna obrigatÃ³ria "Plaqueta".');
  }
  if (!columns.has('local_original')) {
    throw new Error('A aba Patrimonio nÃ£o possui a coluna obrigatÃ³ria "Local_Original".');
  }

  const assets: ParsedAssetRow[] = [];
  const counter = { total: 0 };
  let totalRows = 0;
  let ignored = 0;

  for (let index = 1; index < rows.length; index++) {
    const row = rows[index];
    const rowNumber = index + 1;
    if (!row || isRowEmpty(row)) continue;
    totalRows += 1;

    const plaqueta = normalizePlaqueta(cell(row, columns, 'Plaqueta'));
    if (!plaqueta) {
      ignored += 1;
      addIssue(
        issues,
        {
          tipo: 'asset_sem_plaqueta',
          linha: rowNumber,
          mensagem: 'Linha de bem sem plaqueta foi ignorada.',
        },
        counter,
      );
      continue;
    }

    const descricao = cleanText(cell(row, columns, 'Descricao', 'DescriÃ§Ã£o'));
    const localOriginal = cleanText(cell(row, columns, 'Local_Original', 'Local Original'));
    const parsedLocal = parseLocal(localOriginal);
    const classification = classifyPlaqueta(plaqueta);
    const motivos: ReviewReason[] = [];

    if (isLikelyRoomPlate(plaqueta, descricao)) motivos.push('placa_de_sala');
    if (!descricao) motivos.push('descricao_ausente');
    if (!localOriginal) motivos.push('local_ausente');
    if (classification.formato === 'atipica') motivos.push('plaqueta_atipica');

    assets.push({
      rowNumber,
      plaqueta,
      plaquetaKey: plaquetaKey(plaqueta),
      descricao,
      localOriginal,
      localCodigo: parsedLocal.codigo,
      localNome: parsedLocal.nome,
      idPatrimonio: cleanText(cell(row, columns, 'ID_Patrimonio', 'ID Patrimonio')) || null,
      statusCadastro: cleanText(cell(row, columns, 'Status_Cadastro', 'Status Cadastro')),
      legacyStatus: legacyStatusFrom(cell(row, columns, 'Status')),
      legacyUltimaConferencia: excelValueToIso(cell(row, columns, 'Ultima_Conferencia')),
      legacyAcaoSapiens: cleanText(cell(row, columns, 'AÃ§Ã£o Sapiens', 'Acao Sapiens')),
      legacyAlerta: cleanText(cell(row, columns, 'Alerta de TransferÃªncia', 'Alerta de Transferencia')),
      revisaoPendente: motivos.length > 0,
      revisaoMotivos: motivos,
    });
  }

  const groups = new Map<string, ParsedAssetRow[]>();
  for (const asset of assets) {
    const group = groups.get(asset.plaquetaKey);
    if (group) group.push(asset);
    else groups.set(asset.plaquetaKey, [asset]);
  }

  let duplicateGroups = 0;
  let duplicateRows = 0;
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    duplicateGroups += 1;
    duplicateRows += group.length;
    for (const asset of group) {
      if (!asset.revisaoMotivos.includes('plaqueta_duplicada')) {
        asset.revisaoMotivos.push('plaqueta_duplicada');
      }
      asset.revisaoPendente = true;
      addIssue(
        issues,
        {
          tipo: 'plaqueta_duplicada',
          linha: asset.rowNumber,
          plaqueta: asset.plaqueta,
          mensagem: `Plaqueta duplicada no cadastro (${group.length} ocorrÃªncias).`,
        },
        { total: 0 },
      );
    }
  }

  return {
    assets,
    issues,
    totalRows,
    ignored,
    roomLike: assets.filter((asset) => asset.revisaoMotivos.includes('placa_de_sala')).length,
    atypical: assets.filter((asset) => asset.revisaoMotivos.includes('plaqueta_atipica')).length,
    withoutDescription: assets.filter((asset) => !asset.descricao).length,
    withoutLocal: assets.filter((asset) => !asset.localOriginal).length,
    duplicateGroups,
    duplicateRows,
  };
}

interface ParsedEventsResult {
  events: ParsedEventRow[];
  issues: ImportWarning[];
  totalRows: number;
  ignored: number;
  missingDate: number;
  missingLocal: number;
  future: number;
  duplicateIds: number;
  repeatedReadRows: number;
}

function parseEvents(
  sheet: XLSX.WorkSheet | null,
  assetsByKey: Map<string, ParsedAssetRow[]>,
  issues: ImportWarning[],
): ParsedEventsResult {
  if (!sheet) {
    return {
      events: [],
      issues,
      totalRows: 0,
      ignored: 0,
      missingDate: 0,
      missingLocal: 0,
      future: 0,
      duplicateIds: 0,
      repeatedReadRows: 0,
    };
  }

  const rows = sheetRows(sheet);
  const columns = buildColumnMap(rows[0] ?? []);
  if (!columns.has('plaqueta')) {
    throw new Error('A aba Conferencia nÃ£o possui a coluna obrigatÃ³ria "Plaqueta".');
  }

  const events: ParsedEventRow[] = [];
  const counter = { total: 0 };
  const idCount = new Map<string, number>();
  const readCount = new Map<string, number>();
  const now = Date.now();
  let totalRows = 0;
  let missingDate = 0;
  let missingLocal = 0;
  let missingPlaqueta = 0;
  let future = 0;

  for (let index = 1; index < rows.length; index++) {
    const row = rows[index];
    const rowNumber = index + 1;
    if (!row || isRowEmpty(row)) continue;
    totalRows += 1;

    const plaqueta = normalizePlaqueta(cell(row, columns, 'Plaqueta'));
    const dataHora = excelValueToIso(cell(row, columns, 'Data_Hora', 'Data Hora'));
    const localBipagem = cleanText(cell(row, columns, 'Local_Bipagem', 'Local Bipagem'));

    if (!dataHora) {
      missingDate += 1;
      addIssue(
        issues,
        {
          tipo: 'evento_sem_data',
          linha: rowNumber,
          plaqueta: plaqueta || undefined,
          mensagem: 'Leitura sem data vÃ¡lida foi ignorada.',
        },
        counter,
      );
      continue;
    }

    if (!localBipagem) {
      missingLocal += 1;
      addIssue(
        issues,
        {
          tipo: 'evento_sem_local',
          linha: rowNumber,
          plaqueta: plaqueta || undefined,
          mensagem: 'Leitura sem sala foi ignorada.',
        },
        counter,
      );
      continue;
    }

    if (!plaqueta) {
      missingPlaqueta += 1;
      addIssue(
        issues,
        {
          tipo: 'evento_sem_plaqueta',
          linha: rowNumber,
          mensagem: 'Leitura sem plaqueta foi ignorada.',
        },
        counter,
      );
      continue;
    }

    const key = plaquetaKey(plaqueta);
    const legacyEventId = cleanText(cell(row, columns, 'ID')) || null;
    if (legacyEventId) idCount.set(legacyEventId, (idCount.get(legacyEventId) ?? 0) + 1);
    readCount.set(key, (readCount.get(key) ?? 0) + 1);
    if (new Date(dataHora).getTime() > now) future += 1;

    events.push({
      rowNumber,
      legacyEventId,
      plaqueta,
      plaquetaKey: key,
      dataHora,
      localBipagem,
      acaoSapiens: cleanText(cell(row, columns, 'AÃ§Ã£o Sapiens', 'Acao Sapiens')),
    });

    if (!assetsByKey.has(key)) {
      addIssue(
        issues,
        {
          tipo: 'leitura_nao_cadastrada',
          linha: rowNumber,
          plaqueta,
          mensagem: 'Leitura de plaqueta sem bem correspondente no cadastro.',
        },
        { total: 0 },
      );
    }
  }

  let duplicateIds = 0;
  for (const count of idCount.values()) if (count > 1) duplicateIds += 1;

  let repeatedReadRows = 0;
  for (const count of readCount.values()) if (count > 1) repeatedReadRows += count - 1;

  return {
    events,
    issues,
    totalRows,
    ignored: missingDate + missingLocal + missingPlaqueta,
    missingDate,
    missingLocal,
    future,
    duplicateIds,
    repeatedReadRows,
  };
}

function parseConfig(sheet: XLSX.WorkSheet | null): string | null {
  if (!sheet) return null;
  const rows = sheetRows(sheet);
  const columns = buildColumnMap(rows[0] ?? []);
  const index = columns.get('sala_atual');
  if (index === undefined) return null;
  for (const row of rows.slice(1)) {
    const value = cleanText(row?.[index]);
    if (value) return value;
  }
  return null;
}

function countDivergences(
  events: ParsedEventRow[],
  assetsByKey: Map<string, ParsedAssetRow[]>,
): number {
  let count = 0;
  for (const event of events) {
    const candidates = assetsByKey.get(event.plaquetaKey);
    if (
      candidates?.length === 1 &&
      roomKey(candidates[0].localOriginal) !== roomKey(event.localBipagem)
    ) {
      count += 1;
    }
  }
  return count;
}

export function inspectWorkbookBuffer(
  buffer: ArrayBuffer,
  fileName: string,
  fileSize: number,
): LegacyImportPreview {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
  const assetsSheet = findSheet(workbook, 'Patrimonio');
  if (!assetsSheet) {
    throw new Error('A planilha nÃ£o contÃ©m a aba "Patrimonio".');
  }

  const issues: ImportWarning[] = [];
  const assetsResult = parseAssets(assetsSheet, issues);
  const assetsByKey = new Map<string, ParsedAssetRow[]>();
  for (const asset of assetsResult.assets) {
    const group = assetsByKey.get(asset.plaquetaKey);
    if (group) group.push(asset);
    else assetsByKey.set(asset.plaquetaKey, [asset]);
  }

  const eventsSheet = findSheet(workbook, 'Conferencia');
  const eventsResult = parseEvents(eventsSheet, assetsByKey, issues);
  const notInCadastro = new Set(
    eventsResult.events
      .filter((event) => !assetsByKey.has(event.plaquetaKey))
      .map((event) => event.plaquetaKey),
  );

  const ignored = assetsResult.ignored + eventsResult.ignored;
  const configSalaAtual = parseConfig(findSheet(workbook, 'Config'));
  const roomDrafts = buildRoomDrafts(
    countRoomLabels([
      ...assetsResult.assets.map((asset) => asset.localOriginal),
      ...(configSalaAtual ? [configSalaAtual] : []),
    ]),
  );
  const mergedRoomLabels = roomDrafts.reduce(
    (total, draft) => total + Math.max(0, draft.aliases.length - 1),
    0,
  );

  return {
    fileName,
    fileSize,
    sheets: workbook.SheetNames,
    configSalaAtual,
    assets: assetsResult.assets,
    events: eventsResult.events,
    issues: issues.slice(0, MAX_ISSUES),
    summary: {
      totalAssetRows: assetsResult.totalRows,
      totalEventRows: eventsResult.totalRows,
      assetsToImport: assetsResult.assets.length,
      eventsToImport: eventsResult.events.length,
      ignored,
      duplicateGroups: assetsResult.duplicateGroups,
      duplicateRows: assetsResult.duplicateRows,
      roomLikeAssets: assetsResult.roomLike,
      atypicalPlaquetas: assetsResult.atypical,
      assetsWithoutDescription: assetsResult.withoutDescription,
      assetsWithoutLocal: assetsResult.withoutLocal,
      eventDuplicateIds: eventsResult.duplicateIds,
      eventsMissingDate: eventsResult.missingDate,
      eventsMissingLocal: eventsResult.missingLocal,
      futureEvents: eventsResult.future,
      notInCadastro: notInCadastro.size,
      divergenceEvents: countDivergences(eventsResult.events, assetsByKey),
      repeatedReadRows: eventsResult.repeatedReadRows,
      roomsToCreate: roomDrafts.length,
      mergedRoomLabels,
    },
  };
}

export async function inspectLegacyWorkbook(file: File): Promise<LegacyImportPreview> {
  const buffer = await file.arrayBuffer();
  return inspectWorkbookBuffer(buffer, file.name, file.size);
}

export function isLegacyWorkbookFile(file: File): boolean {
  return /\.(xlsx|xlsm|xls)$/i.test(file.name);
}
