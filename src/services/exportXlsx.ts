import * as XLSX from 'xlsx';
import type { Asset, AssetSessionState, InventoryEvent, RoomProgress, TransferRequest } from '../domain/types';
import { formatDateTime } from '../domain/format';
import { RESULT_LABELS } from '../domain/constants';
import { downloadBlob, timestampForFilename } from './download';

const STATUS_LABELS: Record<TransferRequest['status'], string> = {
  pendente: 'Pendente',
  enviada: 'Enviada',
  cancelada: 'Cancelada',
  efetivada: 'Efetivada',
};

function downloadWorkbook(workbook: XLSX.WorkBook, prefix: string): string {
  const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const filename = `${prefix}_${timestampForFilename()}.xlsx`;
  downloadBlob(
    new Blob([output], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename,
  );
  return filename;
}

function ensureTextColumn(sheet: XLSX.WorkSheet, rowCount: number, colIndex = 0) {
  for (let index = 0; index < rowCount; index += 1) {
    const address = XLSX.utils.encode_cell({ r: index + 1, c: colIndex });
    const cell = sheet[address];
    if (cell) {
      cell.t = 's';
      cell.v = String(cell.v ?? '');
    }
  }
}

export function buildAuditWorkbook(
  assets: Asset[],
  states: Map<string, AssetSessionState>,
  events: InventoryEvent[],
  sessionId: string,
): XLSX.WorkBook {
  const latestEvent = new Map<string, InventoryEvent>();
  for (const event of events) {
    if (event.inventorySessionId !== sessionId || !event.assetId) continue;
    const current = latestEvent.get(event.assetId);
    if (!current || event.dataHora > current.dataHora) latestEvent.set(event.assetId, event);
  }

  const header = [
    'Plaqueta',
    'Descricao',
    'Local_Original',
    'Status_Sessao',
    'Local_Encontrado',
    'Data_Leitura',
    'Status_Cadastro',
    'Revisao_Pendente',
  ];

  const rows = assets.map((asset) => {
    const state = states.get(asset.id);
    const event = latestEvent.get(asset.id);
    const conferido = state?.conferido ?? false;
    const divergente = state?.divergente ?? false;
    const status = !conferido ? 'Pendente' : divergente ? 'Divergente' : 'Conferido';
    return [
      String(asset.plaqueta),
      asset.descricao,
      asset.localOriginal,
      status,
      event?.localBipagem ?? '',
      event ? formatDateTime(event.dataHora) : '',
      asset.statusCadastro,
      asset.revisaoPendente ? 'SIM' : 'NAO',
    ];
  });

  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ensureTextColumn(sheet, assets.length, 0);
  sheet['!cols'] = [{ wch: 18 }, { wch: 38 }, { wch: 32 }, { wch: 14 }, { wch: 32 }, { wch: 18 }, { wch: 16 }, { wch: 16 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Auditoria_Geral');
  return workbook;
}

export function exportAuditXlsx(
  assets: Asset[],
  states: Map<string, AssetSessionState>,
  events: InventoryEvent[],
  sessionId: string,
): string {
  return downloadWorkbook(buildAuditWorkbook(assets, states, events, sessionId), 'auditoria_geral');
}

export function buildPendingsWorkbook(assets: Asset[], states: Map<string, AssetSessionState>): XLSX.WorkBook {
  const pendings = assets.filter((asset) => asset.ativo && !states.get(asset.id)?.conferido);
  const header = ['Plaqueta', 'Descricao', 'Local_Original', 'Revisao_Pendente'];
  const rows = pendings.map((asset) => [
    String(asset.plaqueta),
    asset.descricao,
    asset.localOriginal,
    asset.revisaoPendente ? 'SIM' : 'NAO',
  ]);

  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ensureTextColumn(sheet, pendings.length, 0);
  sheet['!cols'] = [{ wch: 18 }, { wch: 38 }, { wch: 32 }, { wch: 16 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Pendencias_Faltas');
  return workbook;
}

export function exportPendingsXlsx(assets: Asset[], states: Map<string, AssetSessionState>): string {
  return downloadWorkbook(buildPendingsWorkbook(assets, states), 'pendencias');
}

export function buildSobrasWorkbook(events: InventoryEvent[], sessionId: string): XLSX.WorkBook {
  const rowsData = events.filter(
    (event) =>
      event.inventorySessionId === sessionId &&
      (event.resultado === 'nao_cadastrado' || event.resultado === 'divergente'),
  );

  const header = ['Plaqueta', 'Resultado', 'Local_Bipagem', 'Data_Hora', 'Observacao'];
  const rows = rowsData.map((e) => [
    String(e.plaqueta),
    RESULT_LABELS[e.resultado],
    e.localBipagem,
    formatDateTime(e.dataHora),
    e.observacao ?? '',
  ]);

  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ensureTextColumn(sheet, rowsData.length, 0);
  sheet['!cols'] = [{ wch: 18 }, { wch: 20 }, { wch: 32 }, { wch: 18 }, { wch: 30 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sobras_Divergencias');
  return workbook;
}

export function exportSobrasXlsx(events: InventoryEvent[], sessionId: string): string {
  return downloadWorkbook(buildSobrasWorkbook(events, sessionId), 'sobras_divergencias');
}

export function buildRoomsWorkbook(rooms: RoomProgress[]): XLSX.WorkBook {
  const header = ['Sala', 'Codigo', 'Nome', 'Grafias', 'Total', 'Conferidos', 'Pendentes', 'Divergentes', 'Progresso'];
  const rows = rooms.map((r) => [
    r.local,
    r.codigo ?? '',
    r.nome,
    r.aliases.length,
    r.total,
    r.conferidos,
    r.pendentes,
    r.divergentes,
    `${(r.percentual * 100).toFixed(1)}%`,
  ]);

  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  sheet['!cols'] = [{ wch: 34 }, { wch: 12 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Resumo_Salas');
  return workbook;
}

export function exportRoomsXlsx(rooms: RoomProgress[]): string {
  return downloadWorkbook(buildRoomsWorkbook(rooms), 'resumo_salas');
}

/**
 * Monta a planilha do relatório de transferências. A plaqueta é gravada
 * como texto para preservar zeros à esquerda ao abrir no Excel.
 */
export function buildTransfersWorkbook(transfers: TransferRequest[]): XLSX.WorkBook {
  const header = [
    'Plaqueta',
    'Local_Original',
    'Local_Destino',
    'Data_Solicitacao',
    'Status',
    'Efetivada_Em',
    'Observacao',
  ];

  const rows = transfers.map((transfer) => [
    String(transfer.plaqueta),
    transfer.localOriginal,
    transfer.localDestino,
    formatDateTime(transfer.dataHora),
    STATUS_LABELS[transfer.status],
    transfer.resolvedAt ? formatDateTime(transfer.resolvedAt) : '',
    transfer.observacao ?? '',
  ]);

  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ensureTextColumn(sheet, transfers.length, 0);

  sheet['!cols'] = [
    { wch: 18 },
    { wch: 34 },
    { wch: 34 },
    { wch: 18 },
    { wch: 12 },
    { wch: 18 },
    { wch: 40 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Transferencias');
  return workbook;
}

/** Baixa o relatório de solicitações de transferência em XLSX. */
export function exportTransfersXlsx(transfers: TransferRequest[]): string {
  const workbook = buildTransfersWorkbook(transfers);
  return downloadWorkbook(workbook, 'transferencias');
}
