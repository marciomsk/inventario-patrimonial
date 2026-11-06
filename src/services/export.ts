import type { Asset, AssetSessionState, InventoryEvent, RoomProgress, TransferRequest } from '../domain/types';
import { formatDateTime } from '../domain/format';
import { sameRoom } from '../domain/rooms';
import { REVIEW_REASON_LABELS, RESULT_LABELS } from '../domain/constants';
import { downloadText, timestampForFilename } from './download';

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  const needsQuotes =
    /[;"\r\n]/.test(text) || /^0\d+$/.test(text) || text.trim() !== text || text === '';
  if (!needsQuotes) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((column) => escapeCell(column.header)).join(';');
  const body = rows.map((row) => columns.map((column) => escapeCell(column.value(row))).join(';'));
  return `\uFEFF${[header, ...body].join('\r\n')}\r\n`;
}

function downloadCsv(filename: string, content: string): string {
  downloadText(content, filename, 'text/csv;charset=utf-8');
  return filename;
}

function suffix(): string {
  return timestampForFilename();
}

export function exportAssetsCsv(assets: Asset[]): string {
  const content = toCsv(assets, [
    { header: 'Plaqueta', value: (a) => a.plaqueta },
    { header: 'Descricao', value: (a) => a.descricao },
    { header: 'Local_Original', value: (a) => a.localOriginal },
    { header: 'ID_Patrimonio', value: (a) => a.idPatrimonio },
    { header: 'Status_Cadastro', value: (a) => a.statusCadastro },
    { header: 'Status_Legado', value: (a) => a.legacyStatus },
    { header: 'Revisao_Pendente', value: (a) => (a.revisaoPendente ? 'SIM' : 'NAO') },
    {
      header: 'Motivos_Revisao',
      value: (a) => a.revisaoMotivos.map((reason) => REVIEW_REASON_LABELS[reason]).join(' | '),
    },
    { header: 'Observacao', value: (a) => a.observacao },
    { header: 'Cadastro_Manual', value: (a) => (a.isManualRegister ? 'SIM' : 'NAO') },
    { header: 'Origem', value: (a) => a.source },
  ]);
  return downloadCsv(`bens_${suffix()}.csv`, content);
}

/**
 * Relatório dos bens cadastrados manualmente em campo, com a sala atual e
 * a leitura vinculada. Itens novos ficam marcados por `isManualRegister`.
 */
export function exportManualAssetsCsv(
  assets: Asset[],
  events: InventoryEvent[],
  sessionId?: string | null,
): string {
  const manual = assets
    .filter((asset) => asset.isManualRegister)
    .sort((a, b) => a.plaqueta.localeCompare(b.plaqueta, 'pt-BR'));
  const readByAsset = new Map<string, InventoryEvent>();
  for (const event of events) {
    if (!event.assetId) continue;
    if (sessionId && event.inventorySessionId !== sessionId) continue;
    const current = readByAsset.get(event.assetId);
    if (!current || event.dataHora > current.dataHora) readByAsset.set(event.assetId, event);
  }
  const content = toCsv(manual, [
    { header: 'Plaqueta', value: (a) => a.plaqueta },
    { header: 'Descricao', value: (a) => a.descricao },
    { header: 'Sala', value: (a) => a.localOriginal },
    { header: 'Situacao', value: (a) => a.statusCadastro },
    { header: 'Observacao', value: (a) => a.observacao },
    { header: 'Cadastrado_Em', value: (a) => formatDateTime(a.createdAt) },
    {
      header: 'Leitura_Vinculada',
      value: (a) => {
        const event = readByAsset.get(a.id);
        return event ? formatDateTime(event.dataHora) : '';
      },
    },
  ]);
  return downloadCsv(`itens_novos_${suffix()}.csv`, content);
}

export function exportEventsCsv(
  events: InventoryEvent[],
  assetsById: Map<string, Asset>,
): string {
  const content = toCsv(events, [
    { header: 'Data_Hora', value: (e) => formatDateTime(e.dataHora) },
    { header: 'Plaqueta', value: (e) => e.plaqueta },
    { header: 'Descricao', value: (e) => (e.assetId ? assetsById.get(e.assetId)?.descricao : '') },
    { header: 'Local_Bipagem', value: (e) => e.localBipagem },
    {
      header: 'Local_Original',
      value: (e) => (e.assetId ? assetsById.get(e.assetId)?.localOriginal : ''),
    },
    { header: 'Resultado', value: (e) => RESULT_LABELS[e.resultado] },
    { header: 'Observacao', value: (e) => e.observacao },
    { header: 'Sessao', value: (e) => e.inventorySessionId },
    { header: 'Origem', value: (e) => e.source },
  ]);
  return downloadCsv(`leituras_${suffix()}.csv`, content);
}

export function exportPendingsCsv(
  assets: Asset[],
  states: Map<string, AssetSessionState>,
): string {
  const pendings = assets.filter((asset) => asset.ativo && !states.get(asset.id)?.conferido);
  const content = toCsv(pendings, [
    { header: 'Plaqueta', value: (a) => a.plaqueta },
    { header: 'Descricao', value: (a) => a.descricao },
    { header: 'Local_Original', value: (a) => a.localOriginal },
    { header: 'Revisao_Pendente', value: (a) => (a.revisaoPendente ? 'SIM' : 'NAO') },
  ]);
  return downloadCsv(`pendencias_${suffix()}.csv`, content);
}

export function exportDivergencesCsv(
  assets: Asset[],
  events: InventoryEvent[],
  sessionId: string,
): string {
  const latest = new Map<string, InventoryEvent>();
  for (const event of events) {
    if (
      event.inventorySessionId !== sessionId ||
      !event.assetId ||
      (event.resultado !== 'encontrado' && event.resultado !== 'divergente')
    ) {
      continue;
    }
    const current = latest.get(event.assetId);
    if (!current || event.dataHora > current.dataHora) latest.set(event.assetId, event);
  }
  const rows = assets
    .filter((asset) => {
      const event = latest.get(asset.id);
      return event !== undefined && !sameRoom(asset, event);
    })
    .map((asset) => ({ asset, event: latest.get(asset.id)! }));
  const content = toCsv(rows, [
    { header: 'Plaqueta', value: (row) => row.asset.plaqueta },
    { header: 'Descricao', value: (row) => row.asset.descricao },
    { header: 'Local_Original', value: (row) => row.asset.localOriginal },
    { header: 'Local_Encontrado', value: (row) => row.event.localBipagem },
    { header: 'Data_Leitura', value: (row) => formatDateTime(row.event.dataHora) },
    { header: 'Observacao', value: (row) => row.event.observacao },
  ]);
  return downloadCsv(`divergencias_${suffix()}.csv`, content);
}

export function exportRoomsCsv(rooms: RoomProgress[]): string {
  const content = toCsv(rooms, [
    { header: 'Sala', value: (r) => r.local },
    { header: 'Codigo', value: (r) => r.codigo },
    { header: 'Nome', value: (r) => r.nome },
    { header: 'Grafias_Unificadas', value: (r) => r.aliases.length },
    { header: 'Total_Itens', value: (r) => r.total },
    { header: 'Conferidos', value: (r) => r.conferidos },
    { header: 'Pendentes', value: (r) => r.pendentes },
    { header: 'Divergentes', value: (r) => r.divergentes },
    { header: 'Percentual', value: (r) => `${(r.percentual * 100).toFixed(1)}%` },
  ]);
  return downloadCsv(`resumo_salas_${suffix()}.csv`, content);
}

export function exportUnknownCsv(events: InventoryEvent[], sessionId: string): string {
  const rows = events.filter(
    (event) => event.inventorySessionId === sessionId && event.resultado === 'nao_cadastrado',
  );
  const content = toCsv(rows, [
    { header: 'Plaqueta', value: (e) => e.plaqueta },
    { header: 'Local_Bipagem', value: (e) => e.localBipagem },
    { header: 'Data_Hora', value: (e) => formatDateTime(e.dataHora) },
    { header: 'Observacao', value: (e) => e.observacao },
  ]);
  return downloadCsv(`nao_cadastrados_${suffix()}.csv`, content);
}

export function exportTransfersCsv(transfers: TransferRequest[]): string {
  const content = toCsv(transfers, [
    { header: 'Plaqueta', value: (t) => t.plaqueta },
    { header: 'Local_Original', value: (t) => t.localOriginal },
    { header: 'Local_Destino', value: (t) => t.localDestino },
    { header: 'Data_Solicitacao', value: (t) => formatDateTime(t.dataHora) },
    { header: 'Status', value: (t) => TRANSFER_STATUS_CSV[t.status] },
    { header: 'Efetivada_Em', value: (t) => (t.resolvedAt ? formatDateTime(t.resolvedAt) : '') },
    { header: 'Observacao', value: (t) => t.observacao },
  ]);
  return downloadCsv(`transferencias_${suffix()}.csv`, content);
}

const TRANSFER_STATUS_CSV: Record<TransferRequest['status'], string> = {
  pendente: 'Pendente',
  enviada: 'Enviada',
  cancelada: 'Cancelada',
  efetivada: 'Efetivada',
};

export function exportAuditCsv(
  assets: Asset[],
  states: Map<string, AssetSessionState>,
  events: InventoryEvent[],
  sessionId: string,
): string {
  const latestEvent = new Map<string, InventoryEvent>();
  for (const event of events) {
    if (event.inventorySessionId !== sessionId || !event.assetId) continue;
    const current = latestEvent.get(event.assetId);
    if (!current || event.dataHora > current.dataHora) latestEvent.set(event.assetId, event);
  }

  const rows = assets.map((asset) => {
    const state = states.get(asset.id);
    const event = latestEvent.get(asset.id);
    const conferido = state?.conferido ?? false;
    const divergente = state?.divergente ?? false;
    const status = !conferido ? 'Pendente' : divergente ? 'Divergente' : 'Conferido';
    return {
      asset,
      status,
      localEncontrado: event?.localBipagem ?? '',
      dataLeitura: event ? formatDateTime(event.dataHora) : '',
    };
  });

  const content = toCsv(rows, [
    { header: 'Plaqueta', value: (row) => row.asset.plaqueta },
    { header: 'Descricao', value: (row) => row.asset.descricao },
    { header: 'Local_Original', value: (row) => row.asset.localOriginal },
    { header: 'Status_Sessao', value: (row) => row.status },
    { header: 'Local_Encontrado', value: (row) => row.localEncontrado },
    { header: 'Data_Leitura', value: (row) => row.dataLeitura },
    { header: 'Status_Cadastro', value: (row) => row.asset.statusCadastro },
    { header: 'Revisao_Pendente', value: (row) => (row.asset.revisaoPendente ? 'SIM' : 'NAO') },
  ]);
  return downloadCsv(`auditoria_geral_${suffix()}.csv`, content);
}

export function exportSobrasCsv(events: InventoryEvent[], sessionId: string): string {
  const rows = events.filter(
    (event) =>
      event.inventorySessionId === sessionId &&
      (event.resultado === 'nao_cadastrado' || event.resultado === 'divergente'),
  );
  const content = toCsv(rows, [
    { header: 'Plaqueta', value: (e) => e.plaqueta },
    { header: 'Resultado', value: (e) => RESULT_LABELS[e.resultado] },
    { header: 'Local_Bipagem', value: (e) => e.localBipagem },
    { header: 'Data_Hora', value: (e) => formatDateTime(e.dataHora) },
    { header: 'Observacao', value: (e) => e.observacao },
  ]);
  return downloadCsv(`sobras_divergencias_${suffix()}.csv`, content);
}

export function exportSessionEventsCsv(
  events: InventoryEvent[],
  assetsById: Map<string, Asset>,
  sessionId: string,
): string {
  return exportEventsCsv(
    events.filter((event) => event.inventorySessionId === sessionId),
    assetsById,
  );
}
